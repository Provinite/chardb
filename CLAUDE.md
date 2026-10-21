- Commit changes routinely. Especially when finishing a major step or feature. Use succinct commit messages with the standard commit syntax eg feat(index): add new route
- Always use yarn instead of npm
- Always use yarn dlx instead of npx
- Every time you run cd, it changes your directory in a stateful way. Ensure you are on top of which directory you are in (note: does not apply to subshell cd's)
- Always update the project plan when new requirements are discovered or requested by the user
- You can always just run `yarn install` from the project root to install dependencies for the entire repository
- This project is yarn 4 monorepo
- You can execute yarn scripts in a particular package by running `yarn workspace ${PACKAGE_NAME} ${SCRIPT_NAME}` (example: `yarn workspace @chardb/backend build`)
- You can type check the entire repository by running `yarn type-check` in the root
- You may start the servers if they are not running with `yarn dev:agent`
  - Frontend: `dev.localhost:3000` only on the slot-0 checkout. **Any other checkout uses different ports** — run `yarn instance` to see them, and never assume 3000/4000. See [docs/PARALLEL_INSTANCES.md](./docs/PARALLEL_INSTANCES.md) and the `worktree` skill
  - Communities are served from their own subdomain of the root domain, which is `dev.localhost` locally: `willowmere.dev.localhost:3000`. The spare label is load-bearing — bare `localhost` is a public suffix, so the session cookie could not cross subdomains under it. Every `*.localhost` label resolves to loopback with no `/etc/hosts` entry
- Several checkouts — git worktrees or separate clones, treated identically — can run the app and the e2e suite at the same time: each gets its own ports, databases and containers automatically. `yarn instance:init` prepares a fresh checkout; `yarn instance:up` starts its containers; `yarn instance:down` stops its servers and containers when you are done; `yarn shared:up` starts the machine-wide Jaeger/MailHog/OTEL
- The `gh` cli is configured for github interactions beyond simple `git` cli commands
- Local Development Credentials: See [LOCAL_DEV_SEED_DATA.md](./LOCAL_DEV_SEED_DATA.md) for test user personas and credentials
- Browser E2E tests live in `apps/e2e` (Playwright). Run with `yarn workspace @chardb/e2e e2e` — it starts Postgres, the backend, and the frontend itself; nothing needs to be running first. See [apps/e2e/README.md](./apps/e2e/README.md), especially "Adding a preset"
- To drive the app against a seeded world (by hand or with the Playwright MCP tools): `yarn workspace @chardb/e2e world community-basic --json` prints every id, URL, and credential. Requires the e2e servers to be up
- Use the .tmp folder in the package root for temporary files (like image uploads).
- App-specific changes should go in the appropriate CHANGELOG.md. The root-level CHANGELOG.md is for tracking cross-cutting changes and non-app-specific changes (like CI for example)
- PSQL credentials are in the backend .env file
- Don't use `git -C` unless absolutely necessary. If you're already in the directory you're passing to -C, just omit it.
- Logging conventions:
  - Prefer entirely static log and error messages
  - Prefer strongly typed error subclasses for additional data.
  - Dynamic log content should be log attributes rather than embedded in strings
- Prefer Test-Driven-Development using unit and/or e2e tests as appropriate when feasible.
  1. Write the test
  2. Prove it fails (run it, see red)
  3. Implement
  4. Prove it passes
  5. As bugs are identified, iterate recursively on them with this same TDD workflow (find a bug? write a new test. prove it fails. fix it. prove it passes etc)
- When providing links to files, prefer the relative path from the workspace root, as these are clickable in most terminals properly.