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

## Creating the checkout

If you are not already in one, make it first. In Claude Code, the `EnterWorktree`
tool does this and moves the session into it. By hand, or from another agent
runner:

```bash
git worktree add .claude/worktrees/<name> -b <branch>
cd .claude/worktrees/<name>
```

`.claude/worktrees/` is where this repo keeps them and is gitignored. A separate
`git clone` anywhere on the machine works identically — the instance system does
not care which you use.

Then set it up from inside the new checkout.

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

## Running the app

Run these **in this order**. The order is load-bearing at two points, both
called out below.

```bash
yarn shared:up    # once per machine: Jaeger 16686, MailHog 8025, OTEL collector
yarn instance:up  # this instance's postgres + localstack -- BEFORE yarn dev
yarn workspace @chardb/database db:migrate:prod   # empty database -> schema
yarn workspace @chardb/database db:seed           # admin + a character
yarn dev:agent    # backend + frontend on this instance's ports, tee'd to dev.log
```

**`yarn dev` never returns** — it runs both servers in the foreground until
killed. Start it in the background (Claude Code: Bash with
`run_in_background: true`) or you will block your own session with nothing left
to run the next command. `yarn dev:agent` is `yarn dev | tee dev.log`, which is
the variant to use: you get the same servers plus a log you can grep afterwards,
which is the only way to see why the backend died if it does.

Wait for the backend to answer before going further — the frontend is up in
seconds but the backend compiles first, which takes a minute on a cold start:

```bash
until curl -sf http://localhost:<backendPort>/health; do sleep 2; done
```

Then, with the backend actually up, seed the personas you log in as:

```bash
yarn workspace @chardb/database db:seed-personas
```

**Why the order matters:**

- **`instance:up` before `yarn dev`.** The backend's SQS consumer polls a
  LocalStack queue at boot, and a missing queue throws through winston's
  exception handler and kills the process. The symptom is a wall of
  `QueueDoesNotExist` JSON and a backend that was healthy a second ago — not
  anything that mentions LocalStack being down. A stale `AWS_SQS_QUEUE_URL` in
  `.env` is not a second cause of this: outside slot 0 the injected value wins,
  because a variable already in the environment beats any `.env` file.
- **`yarn dev` before `db:seed-personas`.** That seeder drives the GraphQL API
  over HTTP rather than writing to the database, so it needs a running backend.
  It targets your instance automatically (`GRAPHQL_ENDPOINT` is injected); it
  is not hardcoded to :4000.

**A fresh instance's database is empty.** Skipping the migrate step gets you a
backend that starts, a frontend that renders, and every query failing. There is
no warning — the schema simply is not there.

Read the URLs off `yarn instance` — **do not assume localhost:3000**. That is
slot 0, which is almost certainly the user's own running app.

Log in with any persona from `LOCAL_DEV_SEED_DATA.md`; they all share the
password `test123` (e.g. `siteadmin@test.local`, `member@test.local`).

## Running the tests

**Neither suite needs the containers, migrations or seeding above.** Both
provision their own throwaway database on their own port, and both are already
instance-scoped, so they are safe to run while your `yarn dev` is up and while
other agents are running theirs.

They do still need the `yarn install` and the three package builds from
**Starting** — the suites build their own backend and frontend, which resolve
`@chardb/*` through `dist/` exactly as the dev servers do.

```bash
yarn workspace @chardb/e2e e2e                 # browser suite: own backend, frontend, database
yarn workspace @chardb/e2e e2e tests/smoke     # one directory
yarn workspace @chardb/backend test:e2e        # supertest suite: own postgres-test container
```

The browser suite starts its own postgres-test container, creates and migrates
its own database, builds and boots the backend, builds and serves the frontend,
seeds, and tears it all down. Do not run `instance:up` or seed for it.

To drive the app by hand against a seeded world:

```bash
yarn workspace @chardb/e2e world community-basic --json   # every id, URL and credential
```

Other instance-scoped commands, all unchanged in form:

```bash
yarn dc logs -f backend    # docker compose for this instance
yarn dc ps                 # what this instance has running
```

## Finishing

```bash
yarn instance:down     # always: stop this instance's dev servers AND its containers
yarn instance:release  # only if you are done with the checkout for good
```

**`instance:down` every time; `instance:release` only when abandoning the
checkout.** Keeping the slot is the point — the pin file holds it so your ports
stay the same next session. Release it when you are deleting the checkout or
will not come back, so the slot returns to the pool.

**Always run `yarn instance:down` when you finish.** `yarn dev` outlives whatever
started it — if your session is killed rather than interrupted, nest and vite
keep running and keep the ports. Nothing else will clean them up.

Deleting the checkout directory is also enough — a slot held by a path that no
longer exists is reclaimed automatically. `yarn shared:up`'s containers are
machine-wide; leave them running.

To clear up after checkouts that were abandoned rather than released:

```bash
yarn instance:prune                  # free slots whose checkout is gone
yarn instance:reset                  # free every slot on this machine
yarn instance --prune --stop         # ...and stop what those slots left running
```

Both report the dev servers still on freed ports and the orphaned compose
projects, and only act on them when given `--stop`. Neither can touch slot 0's
project (`docker`, holding the real postgres volume) or the shared tooling —
orphan detection matches `chardb-w<n>` only.

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
