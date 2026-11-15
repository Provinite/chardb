import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import yargs, { type Argv } from "yargs";
import { GraphqlClient } from "./client";
import { CredentialStore, pickToken } from "./credentials";
import {
  CliError,
  DeclinedError,
  EXIT,
  exitCodeForErrors,
  NotFoundError,
  UsageError,
} from "./errors";
import {
  CommunityBySlugDocument,
  CurrentAccessTokenDocument,
  ExternalAccountProvider,
  type GrantItemInput,
  GrantItemDocument,
  ItemTypesDocument,
  UserByUsernameDocument,
} from "./generated/graphql";
import { jsonText, table } from "./output";
import { isMutation, prodGate } from "./prod-gate";
import { ENVIRONMENTS, type Environment, graphqlUrl } from "./target";

/** Everything the CLI touches outside itself, so tests can stand in for it. */
export interface RunOptions {
  argv: string[];
  env: Record<string, string | undefined>;
  fetch: typeof fetch;
  /** All of stdin. */
  stdin: () => Promise<string>;
  stdout: (text: string) => void;
  stderr: (text: string) => void;
  /** Whether there is a person at a terminal to answer a question. */
  interactive: boolean;
  ask: (question: string) => Promise<string>;
  credentialsPath: string;
  /** Where relative file arguments are resolved from. */
  cwd: string;
}

interface GlobalArgs {
  env?: Environment;
  "api-url"?: string;
  json: boolean;
  yes: boolean;
}

interface Session {
  client: GraphqlClient;
  environment: Environment;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The providers `grantItem` accepts a pending owner for. */
const PENDING_PROVIDERS: Record<string, ExternalAccountProvider> = {
  deviantart: ExternalAccountProvider.Deviantart,
  discord: ExternalAccountProvider.Discord,
};

/** Runs one command line. Never throws: every outcome is an exit code. */
export async function run(options: RunOptions): Promise<number> {
  const { stdout, stderr } = options;
  let exitCode: number = EXIT.ok;
  /** Once stdin is read for input, nobody can answer a question on it. */
  let stdinConsumed = false;
  const readStdin = async (): Promise<string> => {
    stdinConsumed = true;
    return options.stdin();
  };

  const session = (args: GlobalArgs): Session => {
    const envToken = options.env.CHARDB_TOKEN;
    const picked = pickToken({
      envToken,
      envFlag: args.env,
      // Not read at all with CHARDB_TOKEN, so a broken file cannot stop it.
      stored: envToken
        ? {}
        : new CredentialStore(options.credentialsPath).read(),
    });
    const url = graphqlUrl(picked.environment, options.env, args["api-url"]);
    if (picked.environment !== "local" && !isHttps(url)) {
      throw new UsageError("A prod or dev token is only ever sent over https");
    }
    return {
      environment: picked.environment,
      client: new GraphqlClient(url, picked.token, options.fetch),
    };
  };

  /** Asks before a change to production; throws unless it may go ahead. */
  const confirmChange = async (
    args: GlobalArgs,
    { client, environment }: Session,
    mutation: boolean,
  ): Promise<void> => {
    const gate = prodGate({
      environment,
      mutation,
      yes: args.yes,
      interactive: options.interactive && !stdinConsumed,
    });
    if (gate === "proceed") return;
    if (gate === "refuse") {
      throw new UsageError(
        "This changes production, and there is no terminal to confirm on. Pass --yes to run it",
      );
    }
    const answer = await options.ask(
      `This changes production (${client.url}). Continue? [y/N] `,
    );
    if (!/^y(es)?$/i.test(answer.trim())) throw new DeclinedError();
  };

  const resolveCommunityId = async (
    client: GraphqlClient,
    community: string,
  ): Promise<string> => {
    if (UUID.test(community)) return community;
    const { communityBySlug } = await client.request(CommunityBySlugDocument, {
      slug: community,
    });
    if (!communityBySlug) throw new NotFoundError("No community has that slug");
    return communityBySlug.id;
  };

  const resolveUserId = async (
    client: GraphqlClient,
    user: string,
  ): Promise<string> => {
    if (UUID.test(user)) return user;
    const { user: found } = await client.request(UserByUsernameDocument, {
      username: user,
    });
    if (!found) throw new NotFoundError("No user has that username");
    return found.id;
  };

  const parser = (yargs(options.argv) as Argv<GlobalArgs>)
    .scriptName("chardb")
    // The bundle leaves yargs' translations behind; source matches it.
    .locale("en")
    .usage("$0 <command> [options]")
    .option("env", {
      choices: ENVIRONMENTS,
      describe: "Which stored token to use",
    })
    .option("api-url", {
      type: "string",
      describe:
        "API to use instead of the one the token names, e.g. http://localhost:21001 (/graphql is added)",
    })
    .option("json", {
      type: "boolean",
      default: false,
      describe: "Print JSON on stdout",
    })
    .option("yes", {
      type: "boolean",
      default: false,
      describe: "Change production without asking",
    })
    .command(
      "whoami",
      "Show the token in use, who it acts as, and what it may do",
      (y) => y,
      async (args) => {
        const s = session(args);
        const { currentAccessToken: token, me } = await s.client.request(
          CurrentAccessTokenDocument,
          {},
        );
        if (args.json) {
          stdout(
            jsonText({
              environment: s.environment,
              apiUrl: s.client.url,
              user: me,
              token,
            }),
          );
          return;
        }
        const rows = [
          ["user", me.username],
          ["api", `${s.client.url} (${s.environment})`],
        ];
        if (token) {
          rows.unshift([
            "token",
            `${token.name} (…${token.displayHint}), expires ${token.expiresAt.slice(0, 10)}`,
          ]);
        }
        stdout(table(rows));
        if (token?.communities.length) {
          stdout("\n");
          stdout(
            table(
              token.communities.map((grant) => [
                grant.community.slug,
                grant.community.name,
                [
                  ...(grant.member ? ["member"] : []),
                  ...grant.permissions,
                ].join(", "),
              ]),
            ),
          );
        }
      },
    )
    .command("communities", "Look up communities", (y) =>
      y
        .command(
          "get <slug>",
          "A community by its subdomain label",
          (c) => c.positional("slug", { type: "string", demandOption: true }),
          async (args) => {
            const { client } = session(args);
            const { communityBySlug } = await client.request(
              CommunityBySlugDocument,
              { slug: args.slug },
            );
            if (!communityBySlug) {
              throw new NotFoundError("No community has that slug");
            }
            stdout(
              args.json
                ? jsonText(communityBySlug)
                : table([
                    [
                      communityBySlug.id,
                      communityBySlug.slug,
                      communityBySlug.name,
                    ],
                  ]),
            );
          },
        )
        .demandCommand(1),
    )
    .command("users", "Look up users", (y) =>
      y
        .command(
          "get <username>",
          "A user by username",
          (c) =>
            c.positional("username", { type: "string", demandOption: true }),
          async (args) => {
            const { client } = session(args);
            const { user } = await client.request(UserByUsernameDocument, {
              username: args.username,
            });
            if (!user) throw new NotFoundError("No user has that username");
            stdout(
              args.json
                ? jsonText(user)
                : table([[user.id, user.username, user.displayName]]),
            );
          },
        )
        .demandCommand(1),
    )
    .command("items", "Item types and grants", (y) =>
      y
        .command(
          "types",
          "List a community's item types",
          (c) =>
            c
              .option("community", {
                type: "string",
                demandOption: true,
                describe: "Community slug or id",
              })
              .option("search", { type: "string" })
              .option("category", { type: "string" })
              .option("limit", { type: "number", default: 100 })
              .option("offset", { type: "number", default: 0 }),
          async (args) => {
            const { client } = session(args);
            const communityId = await resolveCommunityId(
              client,
              args.community,
            );
            const { itemTypes } = await client.request(ItemTypesDocument, {
              filters: {
                communityId,
                limit: args.limit,
                offset: args.offset,
                search: args.search,
                category: args.category,
              },
            });
            if (args.json) {
              stdout(jsonText(itemTypes));
              return;
            }
            stdout(
              table(
                itemTypes.itemTypes.map((t) => [
                  t.id,
                  t.name,
                  t.category,
                  t.isConsumable ? "consumable" : "",
                ]),
              ),
            );
            if (itemTypes.hasMore) {
              stderr(
                `Showing ${itemTypes.itemTypes.length} of ${itemTypes.total}. Page with --offset\n`,
              );
            }
          },
        )
        .command(
          "grant",
          "Grant items of one type to a user or an external account",
          (c) =>
            c
              .option("type", {
                type: "string",
                demandOption: true,
                describe: "Item type id",
              })
              .option("user", {
                type: "string",
                describe: "Recipient's username or id",
              })
              .option("pending", {
                type: "string",
                describe:
                  "External recipient: deviantart:<username> or discord:<user id or username>",
              })
              .option("quantity", { type: "number", default: 1 })
              .option("reason", {
                type: "string",
                describe: "Member-facing note on the ledger",
              })
              .option("staff-note", {
                type: "string",
                describe: "Staff-only note on the ledger",
              }),
          async (args) => {
            if (Boolean(args.user) === Boolean(args.pending)) {
              throw new UsageError("Name a recipient with --user or --pending");
            }
            if (!Number.isInteger(args.quantity) || args.quantity < 1) {
              throw new UsageError(
                "--quantity must be a positive whole number",
              );
            }
            const pendingOwner = args.pending
              ? parsePending(args.pending)
              : undefined;

            const s = session(args);
            const input: GrantItemInput = {
              itemTypeId: args.type,
              quantity: args.quantity,
              reason: args.reason,
              staffNote: args["staff-note"],
              pendingOwner,
            };
            if (args.user)
              input.userId = await resolveUserId(s.client, args.user);

            await confirmChange(args, s, true);
            const { grantItem } = await s.client.request(GrantItemDocument, {
              input,
            });
            stdout(
              args.json
                ? jsonText({ items: grantItem })
                : `Granted ${grantItem.length}\n${table(grantItem.map((item) => [item.id]))}`,
            );
          },
        )
        .demandCommand(1),
    )
    .command(
      "gql [document]",
      "Send a GraphQL document from a file, else from stdin. Prints the whole response",
      (c) =>
        c
          .positional("document", {
            type: "string",
            describe: "File to read; - or none reads stdin",
          })
          // Not `array: true`, which would also swallow the document after it.
          // Repeating the flag still collects every value.
          .option("var", {
            type: "string",
            requiresArg: true,
            describe: "A string variable, as name=value. Repeatable",
          })
          .option("vars", {
            type: "string",
            describe: "Variables as a JSON object",
          })
          .option("operation-name", { type: "string" }),
      async (args) => {
        // yargs hands a bare `-` over as an empty string.
        const query =
          !args.document || args.document === "-"
            ? await readStdin()
            : readDocument(resolve(options.cwd, args.document));
        const variables = {
          ...parseVarsJson(args.vars),
          ...parseVarPairs(([] as unknown[]).concat(args.var ?? [])),
        };
        const operationName = args["operation-name"];
        const mutation = isMutation(query, operationName);

        const s = session(args);
        await confirmChange(args, s, mutation);
        const response = await s.client.send(query, variables, operationName);
        stdout(jsonText(response));
        if (response.errors?.length) {
          exitCode = exitCodeForErrors(response.errors);
        }
      },
    )
    .command("auth", "Manage stored tokens", (y) =>
      y
        .command(
          "add",
          "Store a token read from stdin, under the environment it names",
          (c) => c,
          async () => {
            const token = (await options.stdin()).trim();
            const environment = new CredentialStore(
              options.credentialsPath,
            ).add(token);
            stderr(`Stored the ${environment} token\n`);
          },
        )
        .command(
          "list",
          "List stored tokens by their last four characters",
          (c) => c,
          async (args) => {
            const stored = new CredentialStore(options.credentialsPath).read();
            const rows = ENVIRONMENTS.flatMap((environment) => {
              const token = stored[environment];
              return token ? [{ environment, hint: token.slice(-4) }] : [];
            });
            stdout(
              args.json
                ? jsonText(rows)
                : table(rows.map((r) => [r.environment, `…${r.hint}`])),
            );
          },
        )
        .command(
          "remove <environment>",
          "Forget the stored token for an environment",
          (c) =>
            c.positional("environment", {
              choices: ENVIRONMENTS,
              demandOption: true,
            }),
          async (args) => {
            const removed = new CredentialStore(options.credentialsPath).remove(
              args.environment,
            );
            if (!removed) {
              throw new NotFoundError(
                "No token is stored for that environment",
              );
            }
            stderr(`Removed the ${args.environment} token\n`);
          },
        )
        .demandCommand(1),
    )
    .demandCommand(1)
    .strict()
    .exitProcess(false)
    .showHelpOnFail(false)
    .fail((message, err) => {
      throw err ?? new UsageError(message);
    })
    .help()
    .version(false);

  try {
    await parser.parseAsync();
  } catch (err) {
    if (err instanceof CliError) {
      stderr(`${err.message}\n`);
      for (const [key, value] of Object.entries(err.details)) {
        stderr(`  ${key}: ${value}\n`);
      }
      return err.exitCode;
    }
    if (err instanceof Error && err.name === "YError") {
      stderr(`${err.message}\n`);
      return EXIT.usage;
    }
    stderr("Unexpected error\n");
    stderr(`  ${err instanceof Error ? err.message : String(err)}\n`);
    return EXIT.failed;
  }
  return exitCode;
}

function isHttps(url: string): boolean {
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}

function parsePending(value: string) {
  const separator = value.indexOf(":");
  const provider = PENDING_PROVIDERS[value.slice(0, separator).toLowerCase()];
  const providerAccountId = value.slice(separator + 1);
  if (separator <= 0 || !provider || !providerAccountId) {
    throw new UsageError(
      "--pending takes deviantart:<username> or discord:<user id or username>",
    );
  }
  return { provider, providerAccountId };
}

function readDocument(path: string): string {
  try {
    return readFileSync(path, "utf8");
  } catch {
    throw new UsageError("Could not read the GraphQL document file");
  }
}

function parseVarsJson(text: string | undefined): Record<string, unknown> {
  if (text === undefined) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new UsageError("--vars is not valid JSON");
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new UsageError("--vars must be a JSON object");
  }
  return parsed as Record<string, unknown>;
}

function parseVarPairs(pairs: unknown[]): Record<string, string> {
  const variables: Record<string, string> = {};
  for (const raw of pairs) {
    const pair = String(raw);
    const separator = pair.indexOf("=");
    if (separator <= 0) throw new UsageError("--var takes name=value");
    variables[pair.slice(0, separator)] = pair.slice(separator + 1);
  }
  return variables;
}
