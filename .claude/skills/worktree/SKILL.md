---
name: worktree
description: Start work in a fresh git worktree with its own running instance of the app — its own ports, database, containers and e2e run — so several agents can build and test in parallel without colliding. Use when asked to work in a worktree, to run the app or e2e tests while another agent or the user already has them running, or when "port already in use" / "container name already in use" / "database is being accessed by other users" shows up.
---

# Working in a parallel worktree

This repo supports N simultaneous copies of the whole stack. Each worktree gets
an **instance slot**: a small integer that offsets every host port, database
name and docker compose project name. Slot 0 is reserved for the primary
checkout and keeps the historical ports (3000/4000/5433/4566); every worktree
gets slot 1..15 and a contiguous 100-port block at `20000 + slot*100`.

You never compute any of this. `scripts/with-instance.mjs` wraps every dev,
database and test script and injects the right values, so the ordinary commands
already do the right thing inside a worktree.

## Starting

```bash
yarn install          # yarn 4 workspaces; the worktree needs its own node_modules
yarn instance:init    # copies .env files from the primary checkout, prints your slot
yarn instance         # the full table: every port, URL and database name
```

`instance:init` is the only extra step versus working in the primary checkout.
It exists because `.env` files are gitignored, so a new worktree has none and
the backend will not boot without `JWT_SECRET` and the OAuth client ids.

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
yarn instance:release  # hand the slot back so a future worktree can reuse it
```

Deleting the worktree directory is also enough — a slot held by a path that no
longer exists is reclaimed automatically. `yarn shared:up`'s containers are
machine-wide; leave them running.

## Rules

- **Never touch the primary checkout.** No `git checkout`, no edits, no
  `docker compose down` from it. The user is usually running it.
- **Never hardcode a port.** Get them from `yarn instance` (or
  `yarn instance --json` if you are parsing).
- **Do not commit `.instance.json`.** It is gitignored; it pins this worktree's
  slot so the ports stay stable across runs.
- **`yarn instance:list`** shows every claimed slot and which worktree holds it.
  Run it before blaming a port conflict on something else.

## Known limits

- **OAuth login does not work outside slot 0.** DeviantArt, Discord and ToyHouse
  have `localhost:4000` callbacks registered provider-side. Use seeded personas
  (see `LOCAL_DEV_SEED_DATA.md`) instead of the OAuth flows.
- **MailHog is shared.** Every instance's mail lands in one inbox at
  http://localhost:8025.
- **Jaeger is shared but separable.** Pick your instance by service name in the
  dropdown: `chardb-backend-w3` for slot 3.
- **15 worktree slots.** Past that, `yarn instance` fails with the list of
  occupants rather than handing out a duplicate. Free one, or raise
  `CHARDB_SLOTS`.

Full reference: `docs/PARALLEL_INSTANCES.md`.
