import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CredentialStore } from "./credentials";
import { run, type RunOptions } from "./run";

const PROD = "chardb_pat_prod_secretAAAA";
const LOCAL = "chardb_pat_local_secretBBBB";

const COMMUNITY_ID = "6f1c2b0e-5f6a-4c1d-9a3e-0a1b2c3d4e5f";
const USER_ID = "0b6a1f9e-2c3d-4e5f-8a9b-1c2d3e4f5a6b";
const TYPE_ID = "9d8c7b6a-5e4f-4a3b-8c2d-1e0f9a8b7c6d";

interface SentRequest {
  url: string;
  authorization: string | null;
  operationName: string | undefined;
  query: string;
  variables: Record<string, unknown>;
}

type Responder = (
  request: SentRequest,
) => { status?: number; body: unknown } | undefined;

/** A fake API: answers each request by operation name, records them all. */
function fakeApi(responder: Responder) {
  const sent: SentRequest[] = [];
  const fetchStub: typeof fetch = async (input, init) => {
    const payload = JSON.parse(String(init?.body)) as {
      query: string;
      variables?: Record<string, unknown>;
      operationName?: string;
    };
    const headers = new Headers(init?.headers);
    const request: SentRequest = {
      url: String(input),
      authorization: headers.get("authorization"),
      operationName:
        payload.operationName ??
        /(?:query|mutation)\s+(\w+)/.exec(payload.query)?.[1],
      query: payload.query,
      variables: payload.variables ?? {},
    };
    sent.push(request);
    const answer = responder(request) ?? {
      body: { errors: [{ message: "unexpected request" }] },
    };
    return new Response(JSON.stringify(answer.body), {
      status: answer.status ?? 200,
      headers: { "content-type": "application/json" },
    });
  };
  return { fetch: fetchStub, sent };
}

interface Harness {
  options: Partial<RunOptions>;
  stdout: string[];
  stderr: string[];
  questions: string[];
}

function harness(overrides: Partial<RunOptions> = {}): Harness {
  const dir = mkdtempSync(join(tmpdir(), "chardb-cli-run-"));
  const stdout: string[] = [];
  const stderr: string[] = [];
  const questions: string[] = [];
  return {
    stdout,
    stderr,
    questions,
    options: {
      env: { CHARDB_TOKEN: LOCAL },
      stdout: (s) => stdout.push(s),
      stderr: (s) => stderr.push(s),
      stdin: async () => "",
      interactive: false,
      ask: async (question) => {
        questions.push(question);
        return "n";
      },
      credentialsPath: join(dir, "credentials.json"),
      cwd: dir,
      ...overrides,
    },
  };
}

const exec = (h: Harness, argv: string[], fetchStub?: typeof fetch) =>
  run({
    ...h.options,
    argv,
    fetch:
      fetchStub ??
      (async () => {
        throw new Error("no request expected");
      }),
  } as RunOptions);

const json = (h: Harness): unknown => JSON.parse(h.stdout.join(""));

const whoamiAnswer = {
  body: {
    data: {
      currentAccessToken: {
        id: "tok-1",
        name: "bank import",
        displayHint: "AAAA",
        expiresAt: "2027-01-01T00:00:00.000Z",
        communities: [
          {
            community: { id: COMMUNITY_ID, name: "Cloverse", slug: "cloverse" },
            member: false,
            permissions: ["canGrantItems"],
          },
        ],
      },
      me: { id: USER_ID, username: "siteadmin" },
    },
  },
};

describe("targeting", () => {
  it("sends the token as a bearer to the API its environment names", async () => {
    const h = harness({ env: { CHARDB_TOKEN: PROD } });
    const api = fakeApi(() => whoamiAnswer);

    expect(await exec(h, ["whoami"], api.fetch)).toBe(0);

    expect(api.sent[0].url).toBe("https://api.chardb.cc/graphql");
    expect(api.sent[0].authorization).toBe(`Bearer ${PROD}`);
  });

  it("sends a local token to this checkout's backend", async () => {
    const h = harness({
      env: {
        CHARDB_TOKEN: LOCAL,
        GRAPHQL_ENDPOINT: "http://localhost:21001/graphql",
      },
    });
    const api = fakeApi(() => whoamiAnswer);

    await exec(h, ["whoami"], api.fetch);

    expect(api.sent[0].url).toBe("http://localhost:21001/graphql");
  });

  it("uses a stored token named by --env", async () => {
    const h = harness({ env: {} });
    const store = new CredentialStore(h.options.credentialsPath as string);
    store.add(PROD);
    store.add(LOCAL);
    const api = fakeApi(() => whoamiAnswer);

    expect(await exec(h, ["whoami", "--env", "prod"], api.fetch)).toBe(0);

    expect(api.sent[0].authorization).toBe(`Bearer ${PROD}`);
  });

  it("exits 2 with no token to use", async () => {
    const h = harness({ env: {} });

    expect(await exec(h, ["whoami"])).toBe(2);
    expect(h.stderr.join("")).toMatch(/auth add/);
  });
});

describe("whoami", () => {
  it("prints the token, its owner and its grants", async () => {
    const h = harness();

    expect(await exec(h, ["whoami"], fakeApi(() => whoamiAnswer).fetch)).toBe(
      0,
    );

    const out = h.stdout.join("");
    expect(out).toContain("bank import");
    expect(out).toContain("siteadmin");
    expect(out).toContain("cloverse");
    expect(out).toContain("canGrantItems");
  });

  it("prints JSON with --json", async () => {
    const h = harness();

    await exec(h, ["whoami", "--json"], fakeApi(() => whoamiAnswer).fetch);

    expect(json(h)).toMatchObject({
      environment: "local",
      user: { username: "siteadmin" },
      token: { name: "bank import" },
    });
  });

  it("exits 3 when the API refuses the token", async () => {
    const h = harness();
    const api = fakeApi(() => ({
      body: {
        errors: [
          {
            message: "Access token is invalid, expired or revoked",
            extensions: { code: "UNAUTHENTICATED" },
          },
        ],
      },
    }));

    expect(await exec(h, ["whoami"], api.fetch)).toBe(3);
    expect(h.stderr.join("")).toContain(
      "Access token is invalid, expired or revoked",
    );
  });

  it("exits 1 when the API cannot be reached", async () => {
    const h = harness();

    expect(
      await exec(h, ["whoami"], async () => {
        throw new TypeError("fetch failed");
      }),
    ).toBe(1);
    expect(h.stderr.join("")).toMatch(/reach/);
  });
});

describe("communities get", () => {
  it("prints the community a slug names", async () => {
    const h = harness();
    const api = fakeApi((r) =>
      r.operationName === "CommunityBySlug"
        ? {
            body: {
              data: {
                communityBySlug: {
                  id: COMMUNITY_ID,
                  name: "Cloverse",
                  slug: r.variables.slug,
                },
              },
            },
          }
        : undefined,
    );

    expect(
      await exec(h, ["communities", "get", "cloverse", "--json"], api.fetch),
    ).toBe(0);
    expect(json(h)).toEqual({
      id: COMMUNITY_ID,
      name: "Cloverse",
      slug: "cloverse",
    });
  });

  it("exits 4 for a slug no community holds", async () => {
    const h = harness();
    const api = fakeApi(() => ({ body: { data: { communityBySlug: null } } }));

    expect(await exec(h, ["communities", "get", "nowhere"], api.fetch)).toBe(4);
  });
});

describe("users get", () => {
  it("prints the user a username names", async () => {
    const h = harness();
    const api = fakeApi((r) =>
      r.operationName === "UserByUsername"
        ? {
            body: {
              data: {
                user: {
                  id: USER_ID,
                  username: r.variables.username,
                  displayName: null,
                },
              },
            },
          }
        : undefined,
    );

    expect(await exec(h, ["users", "get", "pip", "--json"], api.fetch)).toBe(0);
    expect(json(h)).toEqual({
      id: USER_ID,
      username: "pip",
      displayName: null,
    });
  });

  it("exits 4 for a username nobody holds", async () => {
    const h = harness();
    const api = fakeApi(() => ({ body: { data: { user: null } } }));

    expect(await exec(h, ["users", "get", "nobody"], api.fetch)).toBe(4);
  });
});

describe("items types", () => {
  const typesAnswer: Responder = (r) => {
    if (r.operationName === "CommunityBySlug") {
      return {
        body: {
          data: {
            communityBySlug: {
              id: COMMUNITY_ID,
              name: "Cloverse",
              slug: "cloverse",
            },
          },
        },
      };
    }
    if (r.operationName === "ItemTypes") {
      return {
        body: {
          data: {
            itemTypes: {
              total: 1,
              hasMore: false,
              itemTypes: [
                {
                  id: TYPE_ID,
                  name: "Clover Coin",
                  category: "currency",
                  isConsumable: false,
                },
              ],
            },
          },
        },
      };
    }
    return undefined;
  };

  it("lists a community's item types by its slug", async () => {
    const h = harness();
    const api = fakeApi(typesAnswer);

    expect(
      await exec(h, ["items", "types", "--community", "cloverse"], api.fetch),
    ).toBe(0);

    expect(api.sent.at(-1)?.variables).toEqual({
      filters: { communityId: COMMUNITY_ID, limit: 100, offset: 0 },
    });
    expect(h.stdout.join("")).toContain("Clover Coin");
  });

  it("takes a community id without looking it up", async () => {
    const h = harness();
    const api = fakeApi(typesAnswer);

    await exec(
      h,
      ["items", "types", "--community", COMMUNITY_ID, "--json"],
      api.fetch,
    );

    expect(api.sent.map((r) => r.operationName)).toEqual(["ItemTypes"]);
    expect(json(h)).toMatchObject({ total: 1, itemTypes: [{ id: TYPE_ID }] });
  });
});

describe("items grant", () => {
  const grantAnswer: Responder = (r) => {
    if (r.operationName === "UserByUsername") {
      return {
        body: {
          data: {
            user: { id: USER_ID, username: "pip", displayName: null },
          },
        },
      };
    }
    if (r.operationName === "GrantItem") {
      return {
        body: {
          data: {
            grantItem: [
              { id: "item-1", itemTypeId: TYPE_ID, ownerId: USER_ID },
            ],
          },
        },
      };
    }
    return undefined;
  };

  it("grants to a user named by username", async () => {
    const h = harness();
    const api = fakeApi(grantAnswer);

    expect(
      await exec(
        h,
        [
          "items",
          "grant",
          "--type",
          TYPE_ID,
          "--user",
          "pip",
          "--quantity",
          "2",
          "--reason",
          "Bank import",
          "--staff-note",
          "row 4",
        ],
        api.fetch,
      ),
    ).toBe(0);

    expect(api.sent.at(-1)?.variables).toEqual({
      input: {
        itemTypeId: TYPE_ID,
        userId: USER_ID,
        quantity: 2,
        reason: "Bank import",
        staffNote: "row 4",
      },
    });
  });

  it("grants to a user id without looking it up", async () => {
    const h = harness();
    const api = fakeApi(grantAnswer);

    await exec(
      h,
      ["items", "grant", "--type", TYPE_ID, "--user", USER_ID],
      api.fetch,
    );

    expect(api.sent.map((r) => r.operationName)).toEqual(["GrantItem"]);
    expect(api.sent[0].variables).toEqual({
      input: { itemTypeId: TYPE_ID, userId: USER_ID, quantity: 1 },
    });
  });

  it("grants to an external account as a pending owner", async () => {
    const h = harness();
    const api = fakeApi(grantAnswer);

    expect(
      await exec(
        h,
        [
          "items",
          "grant",
          "--type",
          TYPE_ID,
          "--pending",
          "deviantart:Some-Artist",
        ],
        api.fetch,
      ),
    ).toBe(0);

    expect(api.sent[0].variables).toEqual({
      input: {
        itemTypeId: TYPE_ID,
        quantity: 1,
        pendingOwner: {
          provider: "DEVIANTART",
          providerAccountId: "Some-Artist",
        },
      },
    });
  });

  it("prints the granted items with --json", async () => {
    const h = harness();

    await exec(
      h,
      ["items", "grant", "--type", TYPE_ID, "--user", USER_ID, "--json"],
      fakeApi(grantAnswer).fetch,
    );

    expect(json(h)).toEqual({
      items: [{ id: "item-1", itemTypeId: TYPE_ID, ownerId: USER_ID }],
    });
  });

  it("exits 4 for a username nobody holds, granting nothing", async () => {
    const h = harness();
    const api = fakeApi((r) =>
      r.operationName === "UserByUsername"
        ? { body: { data: { user: null } } }
        : undefined,
    );

    expect(
      await exec(
        h,
        ["items", "grant", "--type", TYPE_ID, "--user", "nobody"],
        api.fetch,
      ),
    ).toBe(4);
    expect(api.sent.map((r) => r.operationName)).toEqual(["UserByUsername"]);
  });

  it.each([
    [["--user", USER_ID, "--pending", "discord:1"]],
    [[]],
    [["--pending", "patreon:1"]],
    [["--pending", "deviantart"]],
  ])("exits 2 for recipient flags %j", async (flags) => {
    const h = harness();

    expect(await exec(h, ["items", "grant", "--type", TYPE_ID, ...flags])).toBe(
      2,
    );
  });

  describe("in production", () => {
    const prodHarness = (interactive: boolean, answer = "n") => {
      const h = harness({ env: { CHARDB_TOKEN: PROD }, interactive });
      h.options.ask = async (question) => {
        h.questions.push(question);
        return answer;
      };
      return h;
    };
    const argv = ["items", "grant", "--type", TYPE_ID, "--user", USER_ID];

    it("asks first, and grants nothing on no", async () => {
      const h = prodHarness(true, "n");
      const api = fakeApi(grantAnswer);

      expect(await exec(h, argv, api.fetch)).toBe(1);

      expect(h.questions).toHaveLength(1);
      expect(api.sent).toEqual([]);
    });

    it("grants on yes", async () => {
      const h = prodHarness(true, "y");
      const api = fakeApi(grantAnswer);

      expect(await exec(h, argv, api.fetch)).toBe(0);
      expect(api.sent.map((r) => r.operationName)).toEqual(["GrantItem"]);
    });

    it("refuses with nobody to ask, unless --yes", async () => {
      const refused = prodHarness(false);
      const api = fakeApi(grantAnswer);
      expect(await exec(refused, argv, api.fetch)).toBe(2);
      expect(api.sent).toEqual([]);

      const confirmed = prodHarness(false);
      expect(await exec(confirmed, [...argv, "--yes"], api.fetch)).toBe(0);
      expect(confirmed.questions).toEqual([]);
    });
  });
});

describe("gql", () => {
  it("runs a document from a file relative to where it was run", async () => {
    const h = harness();
    const file = join(h.options.cwd as string, "q.graphql");
    writeFileSync(file, "query Q($n: String) { a(n: $n) }");
    const api = fakeApi(() => ({ body: { data: { a: 1 } } }));

    expect(
      await exec(
        h,
        ["gql", "q.graphql", "--var", "n=x", "--vars", '{"m": 2}'],
        api.fetch,
      ),
    ).toBe(0);

    expect(api.sent[0].query).toBe("query Q($n: String) { a(n: $n) }");
    expect(api.sent[0].variables).toEqual({ n: "x", m: 2 });
    expect(json(h)).toEqual({ data: { a: 1 } });
  });

  it("reads the document from stdin for -", async () => {
    const h = harness({ stdin: async () => "{ b }" });
    const api = fakeApi(() => ({ body: { data: { b: 2 } } }));

    expect(await exec(h, ["gql", "-"], api.fetch)).toBe(0);
    expect(api.sent[0].query).toBe("{ b }");
  });

  it("prints errors too, and exits 1", async () => {
    const h = harness({ stdin: async () => "{ b }" });
    const api = fakeApi(() => ({
      body: { data: null, errors: [{ message: "nope" }] },
    }));

    expect(await exec(h, ["gql", "-"], api.fetch)).toBe(1);
    expect(json(h)).toEqual({ data: null, errors: [{ message: "nope" }] });
  });

  it("asks before a production mutation", async () => {
    const h = harness({
      env: { CHARDB_TOKEN: PROD },
      interactive: true,
      stdin: async () => "mutation { c }",
    });
    const api = fakeApi(() => ({ body: { data: { c: true } } }));

    expect(await exec(h, ["gql", "-"], api.fetch)).toBe(1);
    expect(h.questions).toHaveLength(1);
    expect(api.sent).toEqual([]);
  });

  it("does not ask before a production query", async () => {
    const h = harness({
      env: { CHARDB_TOKEN: PROD },
      stdin: async () => "query { c }",
    });
    const api = fakeApi(() => ({ body: { data: { c: true } } }));

    expect(await exec(h, ["gql", "-"], api.fetch)).toBe(0);
  });
});

describe("auth", () => {
  it("stores a token read from stdin under its environment", async () => {
    const h = harness({ env: {}, stdin: async () => `  ${PROD}\n` });

    expect(await exec(h, ["auth", "add"])).toBe(0);

    expect(
      new CredentialStore(h.options.credentialsPath as string).read(),
    ).toEqual({ prod: PROD });
    expect(h.stdout.join("")).not.toContain(PROD);
  });

  it("lists stored tokens by their last four characters only", async () => {
    const h = harness({ env: {} });
    new CredentialStore(h.options.credentialsPath as string).add(PROD);

    expect(await exec(h, ["auth", "list"])).toBe(0);

    const out = h.stdout.join("");
    expect(out).toContain("prod");
    expect(out).toContain("AAAA");
    expect(out).not.toContain(PROD);
  });

  it("removes a stored token", async () => {
    const h = harness({ env: {} });
    const store = new CredentialStore(h.options.credentialsPath as string);
    store.add(PROD);

    expect(await exec(h, ["auth", "remove", "prod"])).toBe(0);
    expect(store.read()).toEqual({});
  });
});

describe("usage", () => {
  it("exits 2 for an unknown command", async () => {
    expect(await exec(harness(), ["frobnicate"])).toBe(2);
  });

  it("exits 2 for a missing required option", async () => {
    expect(await exec(harness(), ["items", "types"])).toBe(2);
  });
});
