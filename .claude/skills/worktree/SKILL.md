---
name: worktree
description: Start work in a fresh checkout — a git worktree or a separate clone — with its own running instance of the app, its own ports, database, containers and e2e run, so several agents can build and test in parallel without colliding. Use when asked to work in a worktree or a second clone, to run the app or e2e tests while another agent or the user already has them running, or when "port already in use" / "container name already in use" / "database is being accessed by other users" shows up.
---

# Working in a parallel checkout

This repo supports N simultaneous copies of the whole stack. Each checkout —
a linked worktree or an entirely separate clone, treated identically — gets an
**instance slot**: a small integer that offsets every host port, database name
and docker compose project name. Slot 0 is the legacy instance and keeps the
historical ports (3000/4000/5433/4566); everything else gets slot 1..15 and a
contiguous 100-port block at `20000 + slot*100`.

You never compute any of this. `scripts/with-instance.mjs` wraps every dev,
database and test script and injects the right values, so the ordinary commands
already do the right thing in whichever checkout you are in.

## Starting

```bash
yarn install          # yarn 4 workspaces; each checkout needs its own node_modules
yarn instance:init    # copies .env files from another checkout, prints your slot
yarn workspace @chardb/database db:generate
yarn workspace @chardb/shared build
yarn workspace @chardb/ui build
yarn workspace @chardb/database build
yarn instance         # the full table: every port, URL and database name
```

`instance:init` exists because `.env` files are gitignored, so a new checkout
has none and the backend will not boot without `JWT_SECRET` and the OAuth client
ids. It copies from the checkout a worktree came from, or — for a separate
clone, which has no parent — from any other checkout the registry knows about.

The three builds are not: a fresh checkout of any kind needs them, because
`apps/*` resolve `@chardb/*` through `dist/`. Skipping them fails as
`Cannot find module '.../@chardb/database/dist/index.js'` or `Failed to resolve
entry for package "@chardb/ui"`. Build them in that order — plain `yarn build`
is not topological and trips over `@chardb/ui`.

## Running

```bash
yarn shared:up   # once per machine: Jaeger 16686, MailHog 8025, OTEL collector
yarn infra:up    # this instance's postgres + localstack
yarn dev         # backend + frontend on this instance's ports
```

Read the URLs off `yarn instance` — **do not assume localhost:3000**. That is
slot 0, which is almost certainly the user's own running app.

Other instance-scoped commands, all unchanged in form:

```bash
yarn workspace @chardb/database db:push        # against this instance's database
yarn workspace @chardb/backend test:e2e        # own postgres-test container
yarn workspace @chardb/e2e e2e                 # own backend, frontend, database
yarn workspace @chardb/e2e world community-basic --json
yarn dc logs -f backend                        # docker compose for this instance
```

## Finishing

```bash
yarn infra:down        # stop this instance's containers
yarn instance:release  # hand the slot back so a future checkout can reuse it
```

Deleting the checkout directory is also enough — a slot held by a path that no
longer exists is reclaimed automatically. `yarn shared:up`'s containers are
machine-wide; leave them running.

## Rules

- **Never touch another checkout.** No `git checkout`, no edits, no
  `docker compose down` from it. Someone is usually running it.
- **Never hardcode a port.** Get them from `yarn instance` (or
  `yarn instance --json` if you are parsing).
- **Do not commit `.instance.json`.** It is gitignored; it pins this checkout's
  slot so the ports stay stable across runs.
- **`yarn instance:list`** shows every claimed slot and which checkout holds it.
  Run it before blaming a port conflict on something else.
- **`yarn instance --claim 0`** if this checkout should be the one on the legacy
  ports. It refuses while another live checkout holds slot 0, and a linked
  worktree can never hold it.

## Known limits

- **OAuth login does not work outside slot 0.** DeviantArt, Discord and ToyHouse
  have `localhost:4000` callbacks registered provider-side. Use seeded personas
  (see `LOCAL_DEV_SEED_DATA.md`) instead of the OAuth flows.
- **MailHog is shared.** Every instance's mail lands in one inbox at
  http://localhost:8025.
- **Jaeger is shared but separable.** Pick your instance by service name in the
  dropdown: `chardb-backend-w3` for slot 3.
- **15 non-legacy slots.** Past that, `yarn instance` fails with the list of
  occupants rather than handing out a duplicate. Free one, or raise
  `CHARDB_SLOTS`.

Full reference: `docs/PARALLEL_INSTANCES.md`.
