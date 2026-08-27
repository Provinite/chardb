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

Nothing needs to be running first. The suite starts the Postgres container, creates and migrates its own database, builds and boots the backend, builds and serves the frontend, seeds, and tears down after.

Ports default to **4310** (backend) and **4311** (frontend) so a running `yarn dev` never collides.

## How it works

```
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
| `E2E_SKIP_BUILD` | unset | Reuse `apps/frontend/dist` — much faster spec iteration. |
| `E2E_KEEP_DB` | unset | Skip teardown so the database can be inspected. |
| `E2E_REUSE_SERVERS` | unset | Attach to already-running servers. |

## Troubleshooting

**A test unexpectedly lands on `/login`.** An auth problem, not a UI one. Note that `AuthContext`'s mount effect (`AuthContext.tsx:65`) calls `setLoading(false)` immediately when no `refreshToken` is present — before `useMeQuery` resolves — so `ProtectedRoute` redirects even with a valid access token. This is why `storageState` writes **both** tokens.

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
| Renamed / dropped column | Breaks any spec asserting on it in raw SQL. See the coupling list below. |
| New required field on a GraphQL input | Breaks the relevant document in `src/world/gql.ts` — loudly, at seed time, before any browser opens. |
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
2. **`src/world/gql.ts`** — the GraphQL documents. Fails loudly at seed time.
3. **Raw SQL assertions in specs** — deliberately few, and only where asserting through the UI would be weaker:
   - `tests/world.setup.ts` — role permission columns, `trait_reviews.status`
   - `tests/character-admin/delete-character.e2e.ts` — `characters.deleted_at`, `deleted_by_id`
   - `tests/character-admin/remove-from-species.e2e.ts` — `species_id`, `trait_values`, `custom_fields`, `trait_reviews.status`

   These exist to prove *persisted shape* (a soft delete really is soft; a flatten really wrote custom fields) which the UI alone cannot show. That is a deliberate trade: they are the parts that need updating on a rename, and they are the parts that catch a silently-wrong write.

### Relationship to the other seeding systems

There are three, and they are **not** interchangeable:

| System | Database | Used by | Extend it when |
|---|---|---|---|
| `packages/database/src/seed-personas/` | dev, port 5433, long-lived | manual local dev | you want data while clicking around by hand |
| `apps/backend/test/setup-e2e.ts` (`TestApp`) | `chardb_test`, port 5440 | backend Jest `*.e2e.spec.ts` | writing an API-level test |
| `apps/e2e/src/world/presets/` | `chardb_e2e_ui`, port 5440, per-run | this suite | writing a browser test |

The overlap is real: all three encode "make a user, make a community, make a character". They share no code, so a change to community-creation semantics touches all three. That is the known maintenance cost of this layout. It was accepted rather than solved because the three have genuinely different lifetimes and constraints — long-lived and idempotent, in-process with a mocked module graph, and ephemeral against a live HTTP API. Unifying them would mean the slowest constraints win everywhere.

If they do drift far enough to hurt, the consolidation to make is `seed-personas` onto this preset system — they already share the direct-Prisma-then-GraphQL shape — leaving `TestApp` alone, since in-process supertest is a genuinely different problem.

## Parallelism

`workers: 1`, deliberately. Every port and the database name are already offset by `TEST_PARALLEL_INDEX`, so raising it is a config change rather than a rewrite — but note that a per-worker database **partitions** state, it does not isolate tests from each other within a worker, since a worker runs many spec files sequentially. Per-test isolation comes from `world.reset()`, not from worker count.
