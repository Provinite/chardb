# @chardb/e2e

Browser end-to-end tests: real Chromium, real frontend bundle, real backend, real Postgres.

These are distinct from the backend's `*.e2e.spec.ts` suites, which are supertest-against-Postgres and never render the app.

## Quickstart

```bash
yarn workspace @chardb/e2e e2e            # run everything
yarn workspace @chardb/e2e e2e:ui         # interactive runner
yarn workspace @chardb/e2e e2e:headed     # watch it drive a browser
yarn workspace @chardb/e2e e2e:report     # open the last HTML report

# a single file, or by title
yarn workspace @chardb/e2e e2e tests/smoke
yarn workspace @chardb/e2e e2e --grep "admin strip"
```

Nothing needs to be *running* first. The suite starts the Postgres container, creates and migrates its own database, builds and boots the backend, builds and serves the frontend, seeds, and tears down after.

A fresh checkout does still need building once, though, because the backend and frontend this suite builds resolve `@chardb/*` through `dist/` like any other consumer:

```bash
yarn install
yarn workspace @chardb/database db:generate
yarn workspace @chardb/shared build
yarn workspace @chardb/ui build
yarn workspace @chardb/database build
```

Skipping that fails as `Cannot find module '.../@chardb/database/dist/index.js'` or `Failed to resolve entry for package "@chardb/ui"` — not as anything mentioning the test suite. Plain `yarn build` is not topological and trips over `@chardb/ui`, so run them in that order.

Ports default to **4310** (backend) and **4311** (frontend) so a running `yarn dev` never collides.

In a git worktree they are different again: every port, the compose project and
the database name are offset by that worktree's instance slot, so two agents can
run this suite simultaneously. `yarn instance` prints the numbers; see
[docs/PARALLEL_INSTANCES.md](../../docs/PARALLEL_INSTANCES.md).

## How it works

```
codegen       apps/backend/src/schema.gql -> src/generated/graphql.ts
              (runs first in `e2e`, `world` and `type-check`; output is gitignored)
webServer[0]  docker compose up postgres-test
              CREATE DATABASE chardb_e2e_ui   (dropped + recreated each run)
              prisma migrate deploy  +  drift check
              nest build -> node dist/src/main.js on :4310
webServer[1]  vite build (VITE_API_URL=:4310) -> vite preview on :4311

setup project     build each preset -> snapshot it into a `snap_<preset>` schema
                  write one storageState file per persona
chromium project  per spec file: restore the snapshot, then run
teardown project  drop snapshots + the database
```

### Reset

Seeding runs **once**. Each spec file then restores the snapshot: one transaction that truncates all 33 public tables and re-inserts them from the snapshot schema. It takes ~66ms.

Two details that are load-bearing:

- **`SET LOCAL session_replication_role = 'replica'`** disables FK triggers for the transaction. This is required, not a convenience: every FK in the schema is `NOT DEFERRABLE` (so `SET CONSTRAINTS ALL DEFERRED` is a no-op), and the FK graph has cycles — `users ↔ images`, `characters ↔ media`, `comments → comments` — so no topological insert order exists. It needs superuser, which the test container grants; `assertSuperuser` fails loudly if that ever changes.
- **Restoring rows, not re-seeding**, keeps UUIDs stable for the whole run. The world handle, the minted JWTs, the storageState files and every `a[href="/character/<uuid>"]` selector stay valid across spec files.

Reset is **per spec file** by default, so tests within a file share state. For stricter isolation:

```ts
test.beforeEach(async ({ world }) => { await world.reset(); });
```

The destructive specs (`delete-character`, `remove-from-species`) do exactly this.

## Adding a preset

1. **Write the file** — `src/world/presets/my-thing.ts`:

```ts
import { definePreset } from "../types.js";
import { CREATE_COMMUNITY, CREATE_CHARACTER } from "../gql.js";

export interface MyThingWorld {
  community: { id: string; name: string };
  characters: { hero: { id: string; name: string; url: string } };
}

export default definePreset<MyThingWorld>({
  name: "my-thing",
  description: "One sentence, shown by `yarn world --list`.",

  async build(ctx) {
    const admin = await ctx.user("admin", { isAdmin: true, canCreateCommunity: true });
    const member = await ctx.user("member");

    const { createCommunity: community } = await ctx
      .as("admin")
      .gql(CREATE_COMMUNITY, { createCommunityInput: { name: "Somewhere" } });

    // ...
    return { community, characters: { hero: /* ... */ } };
  },
});
```

2. **Register it** — one line in `src/world/presets/index.ts`.

3. **Eyeball it** — `yarn workspace @chardb/e2e world my-thing --json | jq`.

4. **Use it** — `test.use({ preset: "my-thing", persona: "member" })`.

You never write user creation, password hashing, token minting, storageState, snapshotting, reset, or teardown. `ctx.user()` both creates and *registers* a persona, which is what makes `as()` and auth injection automatic regardless of your handle's shape.

**Rule of thumb:** use `ctx.user()` for anything the API cannot grant you — the global permission flags — and `ctx.as(key).gql()` for everything else. Going through the API means your preset exercises real authorization and can never build a state the app itself could not reach.

### API gotchas the builders exist to encode

| Gotcha | Consequence |
|---|---|
| Argument names are inconsistent — `createSpeciesInput:` vs `input:` | Check `apps/backend/src/schema.gql` per mutation. `gql.ts` already matches it. |
| `ValidationPipe({ forbidNonWhitelisted: true })` | A misspelled or extra input field is a hard error, not a silent drop. |
| `createCommunity` needs **global** `canCreateCommunity` | And it auto-creates the Admin/Moderator/Member roles + binds the creator to Admin. |
| `createCommunityMember` needs **global `isAdmin`** | Not a community permission. Memberships must be assigned as a site admin. |
| `createSpecies` has **no** global-admin bypass | The actor must genuinely hold `canCreateSpecies` in that community. |
| The stock `Moderator` role leaves `canDeleteCharacter` false | `community-basic` creates a custom "Moderator Plus" for the permission matrix. |
| `Community.name` and `Species.name` are **globally** unique | Not scoped to community. Presets are built into a truncated DB so they never collide. |
| `createCharacter` with non-empty `traitValues` auto-creates a **PENDING** `TraitReview` | That is how the review-queue fixture is seeded; there is no separate mutation. |
| Login is by **email**, not username | |

## Writing specs

**Selectors** — role/text/href first, matching the convention in `apps/frontend/src/__tests__/README.md`. The app carries exactly two `data-testid` attributes, both on containers where no accessible role exists:

- `character-admin-actions` — the admin strip on `CharacterPage`
- `trait-review-card` (+ `data-character-id`) — a review row

Prefer `page.locator('a[href="/character/<uuid>"]')` over a test id where possible: it asserts *identity*, not mere presence.

Add a test id only when the element has no role **and** no unambiguous text, put it on the container, and reach the contents with `getByRole` scoped inside it.

**Waiting** — navigate, then assert on expected content. `expect(locator).toBeVisible()` auto-retries, which inherently waits past `App.tsx`'s full-page loading spinner. Never `waitForTimeout`.

**`window.confirm`** — both `CharacterPage` and `TraitReviewQueue` use it. Register the handler **before** the click:

```ts
acceptNextDialog(page, (msg) => expect(msg).toContain(character.name));
await button.click();
```

Playwright auto-*dismisses* unhandled dialogs, so a missing handler makes the app's `if (!window.confirm(...)) return;` early-return, and the test fails as a silent no-op that reads like "the button is broken".

## Driving the app by hand (or with an agent)

```bash
yarn workspace @chardb/e2e world --list
yarn workspace @chardb/e2e world community-basic --json
```

Prints every id, URL and credential for the seeded world. With `--json` only the JSON goes to stdout — logs go to stderr — so it pipes into `jq`. Requires the servers to be up.

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `E2E_HOST` | `127.0.0.1` | Must match the storageState origin; the config asserts this. |
| `E2E_BACKEND_PORT` | `4310` | |
| `E2E_FRONTEND_PORT` | `4311` | |
| `E2E_PG_PORT` | `5440` | The shared test-postgres container. |
| `E2E_DB_NAME` | `chardb_e2e_ui` | Separate from the Jest suite's `chardb_test`. |
| `E2E_FRONTEND_MODE` | `preview` | `dev` serves via Vite dev instead of a production build. |
| `E2E_SKIP_BUILD` | unset | Reuse both `apps/backend/dist` and `apps/frontend/dist` — much faster spec iteration. Each server errors up front if the dist it was told to reuse is missing. |
| `E2E_SKIP_BACKEND_BUILD` | unset | Just the backend half of the above. Exists for CI, which caches the two builds under separate keys and can hit on one and miss on the other. |
| `E2E_SKIP_FRONTEND_BUILD` | unset | Just the frontend half. |
| `E2E_KEEP_DB` | unset | Skip teardown so the database can be inspected. |
| `E2E_REUSE_SERVERS` | unset | Attach to already-running servers. |

## Troubleshooting

**A test unexpectedly lands on `/login`.** An auth problem, not a UI one — the token in `storageState` is missing, malformed, or written under the wrong origin. Check that `E2E_HOST` matches the origin in the state file; a mismatch drops the entries silently and the page looks logged out with no error.

(Historically this also happened with a *valid* token: `AuthProvider`'s mount effect cleared `loading` before the `me` query resolved whenever no `refreshToken` was present. Fixed, and pinned by `tests/smoke/session-restore.e2e.ts`.)

**"timed out waiting for URL".** Usually a port collision. Both servers pre-probe their port and Vite runs with `--strictPort`, so the real error should appear above.

**"E2E reset requires a superuser role".** The Postgres container's role lost superuser; check `docker/services/postgres-test.yml`.

**Stale data after editing a preset.** Snapshots are rebuilt unconditionally on every run, so this should not happen — but `E2E_KEEP_DB=1` from a previous run plus a schema change can confuse things. Drop the database and rerun.

## When the database schema changes

Short version: **additive changes need no work here.** The harness reads the schema at runtime rather than hardcoding it.

| Change | Effort |
|---|---|
| New table | **None.** `listPublicTables` enumerates `pg_class` at runtime, so a new table is truncated, snapshotted and restored automatically. |
| New column (nullable or defaulted) | **None.** Snapshots are `CREATE TABLE ... AS TABLE`, rebuilt from the live schema on every run. |
| New column that is required with no default | Only matters if a **preset** writes that table directly. Today that is one place: `ctx.user()` in `src/world/ctx.ts`, which creates `User` rows via Prisma. Everything else goes through the API and is unaffected. |
| Renamed / dropped column | Nothing, unless it also changes the API. No spec asserts on columns. |
| Renamed / dropped GraphQL field | Fails `yarn codegen` with the file, line, and a suggested field name. |
| New required field on a GraphQL input | Fails `yarn type-check`. Variables are typed from the generated input types. |
| Schema edited without a migration | Caught by the drift check. The run refuses to start and names the table and column. |

Verified by adding a table (`e2e_probes`) plus a column and running the suite: 31/31 passed with no harness change, and both appeared in the snapshot schema. Then removing the migration while keeping the schema edit produced:

```
[*] Changed the `e2e_probes` table
  [+] Added column `forgotten_col`
Migration drift: the committed migrations do not reproduce schema.prisma.
Generate a migration for the outstanding schema changes before running E2E.
```

### Why drift cannot silently rot

The E2E database applies **`prisma migrate deploy`**, not `db push`. `db push` derives the schema from `schema.prisma`, so it structurally cannot notice that a migration fails to reproduce it — the tests would pass and production would break. Running the real chain, then asserting `prisma migrate diff --exit-code`, means the suite is testing the schema production will actually have.

Note this differs from the backend's Jest e2e suite, which still `db push`es its own `chardb_test`. The two use separate databases and do not interfere.

### The coupling points, in full

When something breaks after a schema change, it is one of these three. There is nothing else.

1. **`src/world/ctx.ts`** — the only direct-Prisma write (`User` creation). Required because `signup` demands an invite code and grants no global permission flags.
2. **`src/world/operations/*.graphql`** — the GraphQL documents. These are *checked*, not merely coupled: `graphql-codegen` validates every operation against `apps/backend/src/schema.gql` and generates both the result and variables types, so `Actor.gql` infers them. A renamed field, a wrong argument name, or a new required input fails `yarn codegen` / `yarn type-check` with a file and line — never at seed time, and never as a wrong-shaped response that type-checks against a stale hand-written annotation.
3. **Raw SQL** — there is none in any behavioral assertion. Two `withClient` calls remain and neither is about application behavior:
   - `tests/world.setup.ts` — `assertSuperuser`, a precondition of the reset mechanism.
   - `tests/pool-survives-reset.e2e.ts` — one deliberate out-of-band `DELETE`, whose whole purpose is to change state behind the API's back and prove the backend observes it.

   Everything else is asserted through the UI or the API. See below.

### What belongs in this suite

These tests are about the **app and its observable behavior**. If a user cannot see the difference, it does not belong here — it belongs in a backend unit or integration test, next to the code it describes.

Concretely, this suite asserts that a deleted character stops appearing in browse and its page 404s. It does **not** assert that the delete was soft. Nothing in the product lists or restores deleted characters, so soft-vs-hard is invisible, and `deletedAt` is not exposed anywhere in the GraphQL schema. Asserting it from a browser test would couple this suite to a storage decision three layers away that it cannot observe.

That coverage already exists where it belongs:

| Behavior | Covered by |
|---|---|
| `softDelete` sets `deletedAt`/`deletedById`, cancels pending reviews | `apps/backend/src/characters/characters.service.spec.ts` |
| `purge` hard-deletes, and finds soft-deleted rows | same file, *"should purge a soft-deleted character"* |
| `kickFromSpecies` nulls species fields and clears `traitValues` | same file |
| Soft-deleted characters are invisible to comments, likes, species deletion | `apps/backend/src/characters/deleted-character-isolation.e2e.spec.ts` |

The rule of thumb when adding a spec: **if you cannot phrase the assertion as something a person using the site would notice, it goes in a backend test.**

And where an assertion does need to read state — the fixture contract check in `tests/world.setup.ts` — it goes through the API, never the database, so it cannot be "correct" in a way the app never sees.

### The GraphQL layer is generated, not hand-written

Operations live in `src/world/operations/*.graphql`. `yarn codegen` reads the committed code-first schema from disk (no running backend) and emits `TypedDocumentNode`s, so a call site carries no hand-written types at all:

```ts
// result and variables both inferred from the schema
const { createRole } = await ctx.as("commadmin").gql(SeedCreateRoleDocument, {
  createRoleInput: { name: "Moderator Plus", communityId, canDeleteCharacter: true },
});
```

The generated file is **gitignored** — `e2e`, `world` and `type-check` all run codegen first, so it cannot be stale and there is no drift check to maintain. (This differs from `apps/frontend`, which commits its generated types because the app build consumes them and CI guards them.)

**Two CI jobs cover these operations.** Besides the `e2e` job that runs the suite, root `yarn type-check` runs each workspace's `type-check`, and this one is `yarn codegen && tsc --noEmit` — so a schema change that breaks an E2E document fails the fast `verify` job in about two minutes, without waiting for a browser to start:

```
[FAILED] Cannot query field "canDeleteCharacterTypo" on type "Role".
         Did you mean "canDeleteCharacter", ...?
[FAILED]   at apps/e2e/src/world/operations/seed.graphql:29:7
```

### Relationship to the other seeding systems

There are three, and they are **not** interchangeable:

| System | Database | Used by | Extend it when |
|---|---|---|---|
| `packages/database/src/seed-personas/` | dev, port 5433, long-lived | manual local dev | you want data while clicking around by hand |
| `apps/backend/test/setup-e2e.ts` (`TestApp`) | `chardb_test`, port 5440 | backend Jest `*.e2e.spec.ts` | writing an API-level test |
| `apps/e2e/src/world/presets/` | `chardb_e2e_ui`, port 5440, per-run | this suite | writing a browser test |

The overlap is real: all three encode "make a user, make a community, make a character". They share no code, so a change to community-creation semantics touches all three. That is the known maintenance cost of this layout. It was accepted rather than solved because the three have genuinely different lifetimes and constraints — long-lived and idempotent, in-process with a mocked module graph, and ephemeral against a live HTTP API. Unifying them would mean the slowest constraints win everywhere.

If they do drift far enough to hurt, the consolidation to make is `seed-personas` onto this preset system — they already share the direct-Prisma-then-GraphQL shape — leaving `TestApp` alone, since in-process supertest is a genuinely different problem.

## CI

The `e2e` job in `.github/workflows/ci.yml` runs this suite on every pull request and every push to `main`, in parallel with the `verify` (type check) job.

It deliberately does **not** use a GitHub `services:` container for Postgres — the suite starts its own through `docker/compose.test.yml`, exactly as it does locally, so a CI failure reproduces with a plain `yarn workspace @chardb/e2e e2e` and there is no second environment to keep in sync.

- **Browsers are cached** on `~/.cache/ms-playwright`, keyed by the resolved Playwright version, so a version bump busts it automatically. On a cache hit the job still runs `playwright install-deps` — the binary is cached but the system libraries it links against are not.
- **`retries: 1` in CI only** (`retries: 0` locally). A test that fails twice still fails the run; this only absorbs a slow cold start or a dropped connection.
- **The run is sharded across six runners.** Each shard is an independent `ubuntu-latest` job with its own Postgres container, database and ports, so nothing has to be isolated for it to work.
- **The backend and frontend builds are cached between runs.** Each shard would otherwise repeat the same 20s nest build and 11s vite build from an identical tree. On a cache hit the shard skips them via `E2E_SKIP_BACKEND_BUILD` / `E2E_SKIP_FRONTEND_BUILD`. Note this cannot help *within* a run: all shards start together, so they all hit or all miss. It pays off on a re-push that leaves app source alone, and on a re-run. Building once in a preceding job and fanning artifacts out would be **slower** — the shards already compile in parallel, so that trades ~31s of parallel work for ~74s of serial work.
- **The workspace package build is deliberately not cached.** It runs `prisma generate`, and `packages/database/src/index.ts` is `export * from "@prisma/client"` — so the package's `dist` re-exports a client that only exists once generate has run. Caching that `dist` and skipping the build restores re-exports that resolve to nothing, and the backend dies at import time on `NotificationKind` being undefined. This was tried; that is what it does.
- **One report, not four.** In CI the reporter is `blob` rather than `html`; each shard uploads its slice as `blob-report-<n>` and the `e2e-report` job merges them into the single `playwright-report` artifact, kept 7 days. Traces, videos, and screenshots are `retain-on-failure` and travel inside the blob, so a red run comes with a step-by-step replay rather than just a stack trace.
- **Changing the shard count** means editing one list: `strategy.matrix.shard` in the `e2e` job. The `--shard` denominator is `strategy.job-total`, so it follows automatically. Keep `shard` the only matrix dimension — `job-total` counts every combination, so a second one would silently multiply the denominator.

## Parallelism

**Locally the suite is one process.** `workers: 1`, no sharding, one browser and one copy of each server. That is unconditional, and it is what you want on a laptop: the suite already brings up Postgres, a nest build and a vite build, and running several of those at once on a developer machine costs more than it saves.

**In CI the parallelism is `--shard`, not `workers`.** These are different axes and only one of them is cheap:

- **Sharding** splits the spec files across N *machines*. Each shard is a separate runner with its own docker daemon, its own database and its own ports, so there is nothing to isolate — which is why it needed no changes to `src/config.ts`. Measured at four shards the split is 128 / 121 / 116 / 121 tests. You can reproduce a single shard locally with `yarn workspace @chardb/e2e e2e --shard=2/4`.
- **Raising `workers`** splits them across *processes on one machine*, and is the harder one. Every port and the database name are offset by `TEST_PARALLEL_INDEX`, but Playwright starts `webServer` entries **once per run, before any worker exists**, so that variable is unset when the servers boot and they all resolve to index 0. Worker 1 would then look for a backend on a port nothing started. Making it work needs N `webServer` entries and N seeded databases. Note too that a per-worker database **partitions** state, it does not isolate tests from each other within a worker, since a worker runs many spec files sequentially — per-test isolation comes from `world.reset()`, not from worker count.

### Cleaning up after a run that did not exit

A normal run — pass, fail, or Ctrl-C — leaves nothing behind. Playwright signals the whole process group; `gracefulShutdown` in `playwright.config.ts` makes that a SIGTERM the servers can act on, and the wrapper scripts in `src/servers/` wait for their child to actually exit before exiting themselves, so the ports are free by the time the command returns.

What that cannot cover is the runner being killed outright — an OOM kill, or `kill -9`. Nothing runs, and a `vite preview` can be left holding its port; because Vite runs with `--strictPort`, the next run fails on it. To reclaim:

```bash
yarn instance:down      # frees this checkout's ports, e2e's included, and stops its containers
```

The Postgres container is a separate matter: `world.teardown.ts` drops the database but deliberately leaves the container up, since it is tmpfs-backed and the backend Jest suite shares it. `docker compose -f docker/compose.test.yml down` stops it.
