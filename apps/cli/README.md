# @chardb/cli

`yarn chardb`: the CharDB API from a shell, authenticated with a personal access token. Small, single-request commands meant to be composed by scripts. Making a token is covered in the [access tokens walkthrough](../../docs/docs/access-tokens.html).

```bash
pbpaste | yarn chardb auth add      # store a token (read from stdin, never argv)
yarn chardb whoami                  # what the token may do, and where
yarn chardb items types --community cloverse
yarn chardb items grant --type <itemTypeId> --user pip --quantity 3 --reason "Event prize"
```

Run it from the repo root, or any directory outside `apps/*` and `packages/*`: Yarn runs a root script from inside a workspace only when its name has a colon. File arguments resolve against the directory it was run from.

## Which token, which API

The token comes from `CHARDB_TOKEN`, else the stored token `--env` names, else the only stored token. Stored tokens live in `$XDG_CONFIG_HOME/chardb/credentials.json` (default `~/.config`), mode 0600, one per environment.

The token's prefix picks the API:

| Token                | API                                                         |
| -------------------- | ----------------------------------------------------------- |
| `chardb_pat_prod_…`  | `https://api.chardb.cc/graphql`                             |
| `chardb_pat_dev_…`   | `https://api.dev.chardb.cc/graphql`                         |
| `chardb_pat_local_…` | this checkout's backend, from its instance slot (`yarn instance`) |

`--api-url` or `CHARDB_API_URL` overrides it. A prod or dev token is only sent to an `https` URL; a local token goes anywhere. A token sent to another environment's API is refused by the API.

## Commands

| Command | Does |
| --- | --- |
| `whoami` | The token's name, expiry, owner and per-community grants |
| `communities get <slug>` | A community's id from its subdomain label |
| `users get <username>` | A user's id |
| `items types --community <slug\|id>` | A community's item types. `--search`, `--category`, `--limit`, `--offset` |
| `items grant --type <id> (--user <username\|id> \| --pending <provider>:<accountId>)` | `grantItem`. `--quantity` (at most 100 per call), `--reason`, `--staff-note`. `--pending` takes `deviantart`, `discord` or `toyhouse` |
| `gql [file]` | Any GraphQL document, from a file or stdin. `--var name=value` (strings), `--vars '<json>'`, `--operation-name`. Prints the whole response |
| `auth add` / `auth list` / `auth remove <env>` | Stored tokens |

Every command does at most one write. Nothing retries, batches or splits a quantity: that is the calling script's job.

## For scripts

- `--json` prints JSON on stdout. Messages go to stderr.
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
