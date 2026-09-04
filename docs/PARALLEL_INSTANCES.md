# Running several instances at once

The whole stack — dev servers, database, LocalStack, both e2e suites — is
parameterized so that N git worktrees can each run their own copy
simultaneously. This is what makes several agents (or an agent and you) able to
build and test in parallel.

## The instance slot

Each worktree gets a **slot**: a small integer that offsets every host port,
database name and docker compose project name.

| slot | who | ports |
|---|---|---|
| `0` | the primary checkout | the historical ones: 3000, 4000, 5433, 5440, 4566, 4310/4311 |
| `1`–`15` | linked worktrees | a contiguous block at `20000 + slot*100` |

Slot 0 is **reserved** for the primary checkout and never handed to a worktree.
That reservation is the point: the checkout you have bookmarked at
localhost:3000, whose OAuth callbacks are registered against localhost:4000, and
whose postgres volume is `docker_postgres_data`, keeps all three no matter which
worktree resolves first. On slot 0 nothing at all is injected — the `.env` files
are the only source of configuration, exactly as before.

Within a slot, offsets are fixed:

```
20000 + slot*100 + 0    frontend dev server
                 + 1    backend
                 + 2    postgres
                 + 3    postgres-test  (both e2e suites)
                 + 4    localstack
                 + 40   e2e backend    ) +2 per Playwright worker,
                 + 41   e2e frontend   ) so `workers` can rise to 30
```

So slot 3 is frontend 20300, backend 20301, postgres 20302, and its e2e run
uses 20340/20341 against database `chardb_e2e_ui_w3` in project `chardb-w3`.

## Commands

```bash
yarn instance            # this worktree's slot and every derived value
yarn instance --json     # the same, machine-readable
yarn instance --env      # KEY=VALUE lines
yarn instance:list       # every claimed slot on this machine
yarn instance:init       # prepare a fresh worktree (see below)
yarn instance:release    # hand the slot back
```

Everything else is the command you already know. `yarn dev`,
`yarn workspace @chardb/e2e e2e`, `yarn workspace @chardb/database db:push` and
the rest are wrapped in `scripts/with-instance.mjs`, which resolves the slot and
injects the derived environment into the child process.

```bash
yarn shared:up   # once per machine: Jaeger, MailHog, OTEL collector
yarn infra:up    # this instance's postgres + localstack
yarn infra:down
yarn dc <args>   # docker compose for this instance, e.g. `yarn dc logs -f backend`
```

## Setting up a new worktree

```bash
git worktree add ../my-feature -b feat/my-feature
cd ../my-feature
yarn install
yarn instance:init
```

`instance:init` copies `apps/backend/.env` and `apps/frontend/.env` from the
primary checkout when it can find one (same machine, same developer, same
secrets) and falls back to the `.env.example` templates otherwise. It never
overwrites a file that already exists. The ports are *not* written into those
files — they are injected at run time, so re-resolving a slot needs no edit and
a `.env` stays a pure secrets file.

## How a slot is chosen

`scripts/instance.mjs` keeps a registry at `~/.chardb/instances.json` mapping
slot → worktree path.

1. `CHARDB_INSTANCE` in the environment wins outright. Useful in CI, where every
   job has its own machine and the registry is pointless.
2. The primary checkout is always slot 0.
3. Otherwise: `.instance.json` in the worktree pins a slot, so ports stay stable
   across runs and reboots.
4. With no pin, the slot is `hash(worktree path) % 15 + 1` — stable for a given
   path — and if that one is taken, the scan walks upward to the next free slot.

Two properties make this safe with several agents starting at once:

- **The whole read-modify-write happens under a cross-process lock**
  (`~/.chardb/instances.lock`, with a stale-lock breaker). Two `yarn dev`
  invocations in the same second cannot both decide slot 3 is free. Registry
  writes are atomic renames, so a broken lock can never expose a half-written
  file.
- **A slot held by a path that no longer exists is reclaimed.** Deleting a
  worktree frees its slot with no cleanup step.

If all 15 worktree slots are held by live worktrees, resolution fails with the
list of occupants rather than handing out a duplicate. Free one with
`yarn instance:release`, delete a worktree, or raise `CHARDB_SLOTS`.

## What is shared, and what that costs

Per instance: postgres, postgres-test, LocalStack, the dev servers, both e2e
suites, and every database.

Shared machine-wide (`docker/compose.shared.yml`, project `chardb-shared`):
Jaeger, MailHog and the OTEL collector. They are read-only inspection surfaces
with no per-instance state worth isolating, and each wants a well-known port a
human types into a browser. The costs:

- **MailHog does not separate instances.** All captured mail lands in one inbox
  at http://localhost:8025.
- **Jaeger is shared but separable** — each instance sends a distinct
  `OTEL_SERVICE_NAME` (`chardb-backend`, `chardb-backend-w1`, …), so pick yours
  from the service dropdown at http://localhost:16686.

## Limits

- **OAuth login only works on slot 0.** DeviantArt, Discord and ToyHouse
  callbacks are registered provider-side against `localhost:4000`. Other
  instances get a self-consistent callback URL, but the provider will reject it.
  Use the seeded personas in [LOCAL_DEV_SEED_DATA.md](../LOCAL_DEV_SEED_DATA.md).
- **`yarn install` is per worktree.** Yarn 4 workspaces do not share
  `node_modules` across worktrees.

## Migrating an existing checkout

The shared services moved out of `docker/compose.yaml` into
`docker/compose.shared.yml`, and they keep their fixed container names. Compose
will not adopt containers from the old project, so once:

```bash
docker rm -f chardb-jaeger chardb-mailhog chardb-otel-collector
yarn shared:up
```

The dev containers lost their pinned `container_name`, so `chardb-postgres`
becomes `docker-postgres-1`. The volume (`docker_postgres_data`) is unchanged —
no data moves, no database is recreated.
