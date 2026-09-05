# Running several instances at once

The whole stack — dev servers, database, LocalStack, both e2e suites — is
parameterized so that N checkouts can each run their own copy simultaneously.
This is what makes several agents (or an agent and you) able to build and test
in parallel.

**A checkout is a checkout.** Linked git worktrees and entirely separate clones
are treated identically, keyed by absolute path; nothing here assumes the copies
share a `.git`.

## The instance slot

Each checkout gets a **slot**: a small integer that offsets every host port,
database name and docker compose project name.

| slot | who | ports |
|---|---|---|
| `0` | the legacy instance | the historical ones: 3000, 4000, 5433, 5440, 4566, 4310/4311 |
| `1`–`15` | everyone else | a contiguous block at `20000 + slot*100` |

Slot 0 exists so the checkout you have bookmarked on port 3000, whose OAuth
callbacks are registered against port 4000, and whose postgres volume is
`docker_postgres_data`, keeps all three. On slot 0 nothing at all is injected —
the `.env` files are the only source of configuration, exactly as before.

**That includes the root domain**, which is the one thing slot 0 now has to be
told by hand. Since communities are served from their own subdomains, the app
runs on `dev.localhost` and the API on `api.dev.localhost` rather than on
`localhost` — bare `localhost` is a public suffix, so `api.localhost` and
`willowmere.localhost` would be different sites and `SameSite=Lax` would stop
the session cookie ever crossing between them. Every other slot gets
`ROOT_DOMAIN`, `VITE_ROOT_DOMAIN` and a matching `VITE_API_URL` injected; slot 0
needs all three in its `.env` files. See the `.env.example` in each app.

Who gets it:

- **A linked worktree never does.** The checkout it was created from is the
  natural owner, so a worktree always lands in 1–15 no matter which resolves
  first.
- **Among standalone checkouts it is first come, first served**, made sticky by
  the pin file. A lone clone therefore behaves exactly as the single checkout
  always has.
- **`yarn instance --claim 0`** moves it deliberately. It refuses while another
  live checkout holds the slot; `yarn instance:release` there first.

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
yarn instance            # this checkout's slot and every derived value
yarn instance --json     # the same, machine-readable
yarn instance --env      # KEY=VALUE lines
yarn instance --claim 3  # take a specific slot for this checkout
yarn instance:list       # every claimed slot on this machine
yarn instance:init       # prepare a fresh checkout (see below)
yarn instance:release    # hand the slot back
yarn instance:prune      # free slots whose checkout is gone (see Cleaning up)
yarn instance:reset      # free every slot on this machine
```

Everything else is the command you already know. `yarn dev`,
`yarn workspace @chardb/e2e e2e`, `yarn workspace @chardb/database db:push` and
the rest are wrapped in `scripts/with-instance.mjs`, which resolves the slot and
injects the derived environment into the child process.

```bash
yarn shared:up      # once per machine: Jaeger, MailHog, OTEL collector
yarn instance:up    # this instance's postgres + localstack
yarn instance:down  # stop this instance's dev servers AND its containers
yarn dc <args>      # docker compose for this instance, e.g. `yarn dc logs -f backend`
```

## Setting up a new checkout

Either shape works, and the steps after the first line are identical:

```bash
git worktree add ../my-feature -b feat/my-feature   # a linked worktree
git clone git@github.com:Provinite/chardb.git ../chardb-2   # or a separate clone

cd ../my-feature
yarn install
yarn instance:init
yarn workspace @chardb/database db:generate
yarn workspace @chardb/shared build
yarn workspace @chardb/ui build
yarn workspace @chardb/database build
```

Only `instance:init` is instance-specific. The generate and the three builds are
what any fresh checkout needs — `apps/*` resolve `@chardb/*` through `dist/` —
and they have to run in that order, because `yarn build` is not topological.

`instance:init` copies `apps/backend/.env` and `apps/frontend/.env` from another
checkout on this machine (same developer, same secrets) and falls back to the
`.env.example` templates otherwise. It looks first at the checkout a worktree
came from, then at any other checkout in the registry that still exists on disk
— which is how a separate clone, with no parent to inherit from, still gets its
secrets. It never overwrites a file that already exists.

The ports are *not* written into those files — they are injected at run time, so
re-resolving a slot needs no edit and a `.env` stays a pure secrets file.

## How a slot is chosen

`scripts/instance.mjs` keeps a registry at `~/.chardb/instances.json` mapping
slot → checkout path.

1. `CHARDB_INSTANCE` in the environment wins outright. Useful in CI, where every
   job has its own machine and the registry is pointless.
2. `--claim <n>` takes a specific slot, failing if a live checkout holds it.
3. `.instance.json` in the checkout pins a slot, so ports stay stable across
   runs and reboots.
4. A standalone checkout takes slot 0 while it is going spare.
5. Otherwise the slot is `hash(checkout path) % 15 + 1` — stable for a given
   path — and if that one is taken, the scan walks upward to the next free slot.

Three properties make this safe with several agents starting at once:

- **The whole read-modify-write happens under a cross-process lock**
  (`~/.chardb/instances.lock`, with a stale-lock breaker). Two `yarn dev`
  invocations in the same second cannot both decide slot 3 is free. Registry
  writes are atomic renames, so a broken lock can never expose a half-written
  file.
- **Slots are keyed by absolute path**, so two clones of the repo are as
  distinct as two worktrees — nothing depends on a shared `.git`.
- **A slot held by a path that no longer exists is reclaimed.** Deleting a
  checkout frees its slot with no cleanup step.

If all 15 non-legacy slots are held by live checkouts, resolution fails with the
list of occupants rather than handing out a duplicate. Free one with
`yarn instance:release`, delete a checkout, or raise `CHARDB_SLOTS`.

## Cleaning up

An instance leaves two kinds of thing running, and they leak differently.

**Containers** are owned by compose and stop when told. **Dev servers are the
half that actually leaks:** `yarn dev` outlives whatever started it, so an agent
killed rather than interrupted leaves a nest and a vite holding the slot's ports
until someone notices. Nothing runs cleanup for a process that was SIGKILLed.

So the habit that matters is one command when you finish:

```bash
yarn instance:down            # this checkout's dev servers AND its containers
yarn instance:down --volumes  # ...and drop its database too
```

A checkout you **delete** needs no slot cleanup: it is reclaimed the moment
another checkout looks for a free one. What accumulates is checkouts that still
exist but are abandoned, plus whatever either kind left running.

```bash
yarn instance:prune                  # free slots whose checkout is gone from disk
yarn instance:reset                  # free every slot on this machine
yarn instance --prune --stop         # ...and stop what those slots left running
yarn instance --reset --stop
```

Both print what they freed, then report two things: dev servers still holding
the ports of freed slots, and compose projects no live checkout claims. Without
`--stop` that is all they do — the lists are a report, and you get the
command to act on them. With it, the servers are stopped (SIGTERM, then SIGKILL
after a grace period) and each orphaned project is torn down with its volumes.

A dev server is only ever stopped if it was started from the checkout that owns
those ports — verified through `/proc/<pid>/cwd`, not assumed from the port
number. The one exception is a checkout that no longer exists on disk, where a
leftover server cannot prove its provenance and nothing else could be listening
there anyway.

`reset` is close to free: pin files elsewhere survive, so every live checkout
re-claims the slot it already had the next time it runs. What it actually
releases is the abandoned ones.

**The legacy instance is out of reach here.** Orphan detection only ever matches
project names of the form `chardb-w<n>`, and slot 0's project is `docker` — so
`docker_postgres_data`, the one volume with real data in it, cannot be caught by
any of these commands. Shared tooling (`chardb-shared`) is equally immune; stop
it with `yarn shared:down`.

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

- **OAuth account linking only works on slot 0.** DeviantArt, Discord and
  ToyHouse callbacks are registered provider-side against `localhost:4000`.
  Other instances get a self-consistent callback URL, but the provider will
  reject it. This is linking, not signing in — sign in with the seeded personas
  in [LOCAL_DEV_SEED_DATA.md](../LOCAL_DEV_SEED_DATA.md), which works on every
  slot and, since the session cookie covers the whole root domain, on every
  community subdomain at once.
- **`yarn install` is per checkout.** Yarn 4 workspaces do not share
  `node_modules` between checkouts of any kind.

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
