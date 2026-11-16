# @chardb/cli

`yarn chardb`: the CharDB API from a shell, authenticated with a personal access token. Small, single-request commands meant to be composed by scripts. Making a token is covered in the [access tokens walkthrough](../../docs/docs/access-tokens.html).

```bash
yarn chardb auth add < token.txt    # store a token (read from stdin, never argv)
yarn chardb whoami                  # what the token may do, and where
yarn chardb items types --community cloverse
yarn chardb items grant --type <itemTypeId> --user pip --quantity 3 --reason "Event prize"
```

Run it from the repo root, or any directory outside `apps/*` and `packages/*`: Yarn runs a root script from inside a workspace only when its name has a colon. File arguments resolve against the directory it was run from.

## The bundle

`yarn chardb` boots Yarn and compiles the source on every call, which costs well over a second. A script making many calls should run the bundle instead: `apps/cli/dist/chardb.mjs`, one file with its dependencies built in, which starts in under a tenth of a second. It is committed, so every checkout has the bundle its own source builds to.

```bash
npm i -g ./apps/cli    # once: puts `chardb` on PATH
chardb whoami
```

`npm i -g` links the package's `chardb` bin to this checkout's `dist/chardb.mjs`, so pulling updates the command.

After changing the CLI's source or dependencies, run `yarn workspace @chardb/cli build` and commit the bundle. A test fails while the committed bundle differs from a fresh build.

Inside `apps/cli`, `yarn chardb` runs the bundle rather than the root script. Use it from the repo root.

## Which token, which API

The token comes from `CHARDB_TOKEN`, else the stored token `--env` names, else the only stored token. Stored tokens live in `$XDG_CONFIG_HOME/chardb/credentials.json` (default `~/.config`), mode 0600, one per environment.

The token's prefix picks the API:

| Token                | API                                                         |
| -------------------- | ----------------------------------------------------------- |
| `chardb_pat_prod_…`  | `https://api.chardb.cc/graphql`                             |
| `chardb_pat_dev_…`   | `https://api.dev.chardb.cc/graphql`                         |
| `chardb_pat_local_…` | `http://localhost:4000/graphql`                             |

`--api-url` or `CHARDB_API_URL` overrides it; `/graphql` is added to a URL without it. A prod or dev token is only sent to an `https` URL. A token sent to another environment's API is refused by the API.

In a worktree, the backend is not on port 4000. Take its port from the `backend` line of `yarn instance` and set it once:

```bash
export CHARDB_API_URL=http://localhost:21001   # the backend port, on plain localhost
```

Use `localhost`, not the `api.dev.localhost` host `yarn instance` prints: Node cannot resolve it. Without this, a local token goes to the main checkout's backend and its database.

## Commands

| Command | Does |
| --- | --- |
| `whoami` | The token's name, expiry, owner, the site permissions it can still use (`site` row, e.g. `isAdmin`), and its permissions in each community (e.g. `canGrantItems`) |
| `communities get <slug>` | A community's id from its subdomain label |
| `users get <username>` | A user's id |
| `items types --community <slug\|id>` | A community's item types. `--search`, `--category`, `--limit`, `--offset` |
| `items grant --type <id> (--user <username\|id> \| --pending <provider>:<account>)` | `grantItem`. `--quantity` (at most 100 per call), `--reason` (members see it), `--staff-note` (staff only) |
| `gql [file]` | Any GraphQL document, from a file or stdin. `--var name=value` (strings), `--vars '<json>'`, `--operation-name`. Prints the whole response. Introspection is off: the schema is `apps/backend/src/schema.gql` |
| `auth add` / `auth list` / `auth remove <env>` | Stored tokens |

Every command does at most one write. Nothing retries, batches or splits a quantity: that is the calling script's job.

`--pending` grants to someone without a CharDB account, held until they link that account:

- `discord:<user id>`, or `discord:<username>` in a community whose Discord server can look it up. Either way the API checks the account with Discord, so it needs a working Discord bot token: a local backend without one answers "Discord could not be reached".
- `deviantart:<username>`. Caveat: an item held for a DeviantArt username is never claimed when that person links their account (issue #449, DeviantArt pending owners stored as handles can never be claimed).

Toyhouse is not accepted for items.

## For scripts

- `--json` prints JSON on stdout. Messages go to stderr. `items grant` prints `{"items":[{"id","itemTypeId","ownerId"}]}`, so `--json | jq -r '.items[].id'` gives the new item ids; the lookups print the record they found.
- A command that changes production asks on the terminal first. With no terminal it is refused unless `--yes` is passed. `gql` asks only for a mutation, and cannot ask at all when the document came in on stdin.
- Exit codes:

| Code | Meaning |
| --- | --- |
| 0 | Done |
| 1 | The request failed, or the confirmation was declined |
| 2 | Usage: a bad flag, a missing argument, no token |
| 3 | The API refused the token (`UNAUTHENTICATED` / `FORBIDDEN`) |
| 4 | A lookup found nothing (`users get`, `communities get`, `--user`, `--community`) |

## Adding a command

1. Add the operation to `src/operations/cli.graphql` and run `yarn workspace @chardb/cli codegen`. The generated file is committed; CI fails when it is stale.
2. Add the command in `src/run.ts`, with a test in `src/run.test.ts` against the fake API there.
3. A token reaches only handlers gated on a community permission, public queries, or handlers marked `@AllowAccessToken()`. Check `apps/backend/src/auth/permission-manifest.txt` before building on one.
