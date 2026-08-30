# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Coin shop.** Communities can sell items for the currency they already
  issue, documented in a new **Coin Shop** walkthrough.

- **Award currency when approving an upload** (#226). Moderators who can also
  grant currency get a recipients widget on each moderation card listing
  everyone the upload names — uploader, credited artist, media owner,
  character owner — with an amount each. Approving pays them in the same
  transaction as the approval.

  Documented in the **Community Currency** walkthrough (a new "Rewarding an
  upload" step, plus the ledger provenance it produces) and in the **Image
  Moderation** walkthrough, with screenshots taken by driving a real upload
  through the queue.

- CI checks `apps/backend/src/schema.gql` for drift, ahead of the existing
  codegen check that reads it. Regenerate with `yarn workspace @chardb/backend
  schema:emit`.

## [v11.3.0] - 2026-08-30

### Added

- **Community currency**: arbitrary many per community, with balances, a
  ledger, member-to-member transfers, and an admin surface. Currency is a
  separate instrument from items rather than an item type that happens to be
  spent — items are one row per instance so each has a history, coin is
  fungible, so a balance row plus a signed ledger is the shape that fits.

  Reuses `canManageItems` / `canGrantItems` rather than defining its own
  permissions. Sending your own coin needs only membership: the balance is the
  authorisation.

  The `100 cc` / `30 cc` item types in production are untouched. They keep
  working as items; converting them into balances is a separate, one-way
  decision that has not been made.

- Added Open Graph metadata to all docs site pages, so shared links unfurl with a name and description.

## [v11.2.0] - 2026-08-30

### Added

- **Three more steps in the item ledger walkthrough**, covering circulation, the member list, and a member's holdings, with screenshots taken against a seeded instance after the pages were reworked by hand.

## [v11.1.0] - 2026-08-30

### Added

- **Product walkthrough for the item ledger** on the docs site (`docs/docs/item-ledger.html`), with screenshots taken against a seeded instance — including the same ledger viewed by staff and by an ordinary member, which is the clearest way to show what a staff note is.

## [v11.0.0] - 2026-08-30

### Added

- CI runs the unit test suites (backend Jest, frontend Vitest, da-import Vitest) on every pull request and on pushes to main, and a staging deploy now waits on them.
- **E2E: `presetTest(name)`** in `apps/e2e/src/fixtures.ts`, plus a `community-items` preset and 38 specs covering the item ledger, imported rows, and the item types admin page.

  The imported-row specs seed an IMPORT batch directly through `ctx.prisma`, in the shape the migration emits. Nothing in the API can produce those rows — by definition they predate the ledger — so without seeding them the most common row type in a real ledger would never be rendered by any test.

  The admin page had no coverage at all before this, which is how the stacking-field removal and the `grantItem` return-shape change went in unverified. Its form labels now carry `htmlFor`, which they lacked entirely; an unassociated label announces nothing to a screen reader.

  Adding a second preset broke every existing spec's types: `test.use({ preset })` is a runtime option, so the shared `world` fixture was typed as the union of every preset's handle and each `world.characters` access stopped compiling. The harness had only ever been correct for one preset. `presetTest` names the preset once at module scope and replaces `test.use({ preset })`, so the declared preset and the handle type cannot disagree. All existing specs were migrated — two lines each.

### Security

- **Item mutations were reachable by any logged-in user.** Fixed for `items.resolver.ts`; see the backend changelog for the mechanism.

  Covered by `apps/e2e/tests/items/item-permissions.e2e.ts` — 24 cases, one per gated operation, each attempting the call as a member without the permission and as a non-member, plus a permitted actor as a positive control. A matrix that only asserts rejection passes just as happily against a resolver that refuses everyone.

  The tests were verified to fail against the bug: reintroducing `@AllowAnyAuthenticated()` on `grantItem` alone turned its three rejection cases red while the positive control and every other operation stayed green.

## [v10.2.2] - 2026-08-29

No functional change. The v10.2.1 entry claimed task definitions now declare `runtimePlatform` explicitly instead of relying on ECS inferring it; they always declared it, and the entry has been corrected (#264).

## [v10.2.1] - 2026-08-29

### Fixed

- Production telemetry reported the version Terraform last applied rather than the one actually deployed, labelling production `10.1.0` while it ran `v10.2.0`; the deploy now sets `OTEL_SERVICE_VERSION` alongside the image.
- Terraform no longer manages a production task definition, so an apply stops registering revisions nothing deploys and a release stops leaving a pending replacement behind (#262).
- Production plans no longer propose a task definition replacement on every run, which had buried real changes (#261).
- Registered task definitions now emit the container-level `cpu` that AWS fills in during normalisation, so a registered revision matches the API's own copy of it.
- Production plans stay empty between real changes: the placeholder image no longer embeds the version and the unread current-revision output is gone, so a release no longer leaves a diff behind for values nothing deploys.

### Removed

- 14 unused Secrets Manager entries in production, superseded by SSM Parameter Store and recoverable for 30 days.

## [v10.2.0] - 2026-08-29

### Added

- **Releasing to production**: publishing a GitHub release promotes the image staging already ran into the production repository under that tag, and rolls the ECS service onto a task definition carrying it. The backend is promoted rather than rebuilt, so production runs the artifact staging tested rather than a fresh build of the same source; a release must therefore be cut from a commit staging has deployed — `gh release create v10.2.0`, or `gh workflow run release.yml -f tag=v10.2.0` to redeploy an existing one. Production stops running a mutable `:latest`, so what is deployed is identifiable and a rollback has an artifact to point at. The deploy refuses a tag that is not an ancestor of `main`, and refuses an image that is not in ECR. Approval before deploy is available by adding a required reviewer to the `production` GitHub environment; the deploy role's trust policy is pinned to that environment, so the gate holds before AWS mints credentials. Note the ECR lifecycle keeps the last 10 `v*` images, which bounds how far back a redeploy can reach.
- **Continuous deployment to staging**: a push to `main` deploys the backend and then the frontend, once `lint`, `verify` and `e2e` pass. Database migrations run automatically as the backend container's entrypoint. Images are tagged `v-<commit sha>` so a running host traces back to a commit. Needs one-time AWS and GitHub setup before it will work — see DEPLOYMENT_GUIDE.md.
- **OIDC deploy role** (`infra/modules/github-actions-deploy`): GitHub Actions authenticates to AWS through federated identity rather than a stored access key, and cannot run `terraform apply`. Note this makes push access to `main` equivalent to deploy access, and to read access on staging's secrets — branch protection is doing real work.
- **CI `lint` job**: runs ESLint and `prettier --check` on every pull request and push to `main`. Scoped to the files a change touches (`yarn lint:changed`, diffed against the merge base), because the repo had no working lint setup to inherit from — both apps carried a `lint` script but no config file, and ESLint's "couldn't find a configuration file" error exits 0 through Yarn, so the scripts had been silently passing. A repo-wide gate would have started life failing on 334 pre-existing errors; this holds new and modified code to the full rule set instead. Note the scope is per file, not per line: touching one line of a file surfaces every violation in it. Commits listed in `.git-blame-ignore-revs` are excluded when working out what changed, so a mechanical tree-wide commit does not drag the entire repo into the changed set.
- **ESLint config** (`.eslintrc.cjs`): one root config for the whole monorepo rather than one per workspace, so `packages/*` is covered too instead of being silently skipped. `eslint:recommended` + `@typescript-eslint/recommended` (the non-type-checked preset — `yarn type-check` already covers what the type-aware rules would catch), with `react-hooks` and `react-refresh` overrides for `apps/frontend` and `packages/ui`, and `eslint-config-prettier` last to stand down the stylistic rules.
- **Prettier config** (`.prettierrc.json`, `.prettierignore`): defaults, plus `endOfLine: lf` to match `.editorconfig`. Markdown, JSON and YAML are ignored deliberately — formatting them would churn large documents for no review benefit.
- `yarn lint:changed`, `yarn lint:fix`, `yarn format` and `yarn format:check` at the repo root.
- **Browser E2E suite** (`apps/e2e`): Playwright driving real Chromium against the production frontend bundle and a real backend. Playwright's `webServer` brings up the test Postgres, creates and migrates a dedicated `chardb_e2e_ui` database, and boots both apps on ports 4310/4311. GraphQL operations are generated with `graphql-codegen` from the committed schema, so documents are schema-validated and both result and variable types are inferred. Seeding uses named presets (direct-Prisma users, then the GraphQL API as those users) with a typed escape hatch, and state resets between spec files via a Postgres snapshot schema in ~66ms. `yarn workspace @chardb/e2e world <preset> --json` prints a seeded world's ids, URLs and credentials for driving the app by hand. (#235)
- **E2E test Postgres service**: `docker/services/postgres-test.yml` and `docker/compose.test.yml` provide an isolated Postgres container on port 5440, started by the Jest global setup for backend e2e runs and reused by the browser suite. The container is deliberately left running between runs (it uses tmpfs, so it holds no state); stop it with `docker compose -f docker/compose.test.yml down`. (#235)
- **Docs walkthrough**: `docs/docs/character-deletion.html` documents character deletion and species removal with screenshots, linked from the docs index. (#235)
- **ToyHouse OAuth account linking**: Full OAuth2 integration allowing users to link their ToyHouse accounts to CharDB for identity verification and pending ownership auto-claim. Includes Passport strategy, controller, frontend callback page, Terraform secrets management, and a Prisma migration adding `TOYHOUSE` to `ExternalAccountProvider`. (#242)
- `scripts/restart-dev-server.sh`: recovers the dev EC2 docker host, looking up its instance ID from the `Name` tag. Performs a stop/start rather than a reboot — see the note under Changed.
- `packages/da-import/scripts/excluded-to-discord.ts`: renders `data/excluded.json` as Discord-ready markdown grouped by exclusion reason.
- **CI `e2e` job**: runs the browser E2E suite on every pull request and push to `main`, in parallel with the type-check job. Starts its own Postgres via `docker/compose.test.yml` rather than a GitHub service container, so a CI failure reproduces locally with `yarn workspace @chardb/e2e e2e`. Caches Chromium keyed by Playwright version, retries once in CI only, and uploads the HTML report plus traces on failure. (#235)
- **CI workflow** (`.github/workflows/ci.yml`): runs `yarn type-check` on every pull request and fails if the committed GraphQL codegen output differs from a fresh regeneration. The repo previously had no PR checks, which let a non-compiling `main` land.

### Changed

- **Application secrets live in SSM Parameter Store** under `/chardb/<environment>/`, rather than in Terraform variables fed from a gitignored `.tfvars`. Set or rotate one with `aws ssm put-parameter --overwrite --type SecureString --name /chardb/dev/discord-bot-token --value ...`; no Terraform run is involved. The staging deploy reads them on the host and refuses to start if any is unset. **Migrating prod off Secrets Manager requires copying the live values across before applying**, or the task definition will inject placeholders — runbook in DEPLOYMENT_GUIDE.md.
- **Deploys and `scripts/ssh-dev.sh` reach the staging host over Session Manager** rather than its public IP, so they work from any machine with AWS credentials instead of only from an address in `backend_ssh_allowed_cidr_blocks`. **Requires `session-manager-plugin` installed locally** (see DEPLOYMENT_GUIDE.md); `DEPLOY_TRANSPORT=direct` falls back to the public IP.
- **A run on `main` is no longer cancelled by a newer push**, since it ends in a deploy. Runs on `main` queue instead; pull request runs still cancel.
- **Dev/staging docker host no longer runs Jaeger or the OTEL collector.** `docker/docker-compose.prod.yml` now includes only Postgres and the backend, and the deploy sets `OTEL_SDK_DISABLED=true`.

  The host is a `t4g.micro` with ~910 MB usable RAM and **no swap** — Amazon Linux 2023's zram-generator only creates zram swap at ≤ 800 MB, so this instance falls in a gap and gets none (`zram0: system has too much memory (910MB), limit is 800MB, ignoring`). Onto that, the prod compose put four containers with no memory limits, including Jaeger all-in-one with default in-memory span storage and no `MEMORY_MAX_TRACES` — unbounded by design. Measured on a developer machine, the same image at the same config reached **772 MB after 13 days** and was still growing.

  The result was a deterministic ~2-day fuse. Console-log evidence from the current boot (2026-07-08 01:55 UTC): container create/destroy churn — the OOM killer versus `restart: unless-stopped` — concentrated entirely between uptime day 2.17 and 2.62, peaking at 312 events in ~15 minutes on 2026-07-10 16:33 UTC, after which the kernel logged nothing but journald rotation for 49 days. `NetworkOut` went to exactly 0 bytes/day on 2026-07-10 and stayed there, while CPU held at a flat ~1.5% and EBS writes continued — a kernel alive but unable to transmit, which is what an out-of-memory livelock with no swap looks like. Over the preceding 180 days the instance transmitted on only 9 of them.

  Tracing is unchanged for local development (`docker/compose.yaml` still includes both services), which is where it was actually used.
- **`scripts/restart-dev-server.sh` now stops and starts the instance instead of rebooting it.** `aws ec2 reboot-instances` sends an ACPI shutdown request *to the guest*; a guest wedged by memory exhaustion cannot service it, so the reboot silently did nothing while the script still reported success. Uptime confirmed no reboot had taken effect for 49 days despite the script being run. Stop/start is performed by the hypervisor and relocates the instance to healthy hardware. The Elastic IP survives it, so the address does not change.
- **Memory limits on the deployed containers**: `mem_limit` of 512m (backend) and 256m (postgres) in `docker/docker-compose.overrides.prod.yml`, so a runaway process is killed inside its container rather than leaving the kernel to pick a victim such as `sshd`. The host has no swap, so these are hard ceilings — `prisma migrate deploy` runs under the backend's at container start. Note these are `mem_limit`, not `deploy.resources.limits.memory`, which `docker compose up` silently ignores outside swarm mode.
- **`deploy.sh` reads IMDS with a token.** The generated remote script fetched `169.254.169.254/latest/meta-data/public-ipv4` unauthenticated, but the instance sets `http_tokens = "required"`, so the call returned 401. It also stops shipping `otel-collector-config.yml` (6 transfers now, not 7).
- **Repository formatted with Prettier**: a one-time mechanical reformat of 411 files, landed as its own pull request ahead of the lint gate so that whole-file reformatting is never mixed into unrelated diffs, and so the gate's first run on `main` is not handed the entire repository as its changed-file set. Verified rather than assumed: the backend was compiled on both revisions and the emitted JavaScript is identical across all 273 files, and ASTs were compared for all 411. The reformat is not purely whitespace — Prettier also reflows CSS inside `styled.*` template literals, reformats `gql` documents (dropping insignificant commas), and re-encodes JSX whitespace (`{' '}` ↔ literal space) — each inert under the parser that consumes it, but each a real change to a runtime string. `.git-blame-ignore-revs` is added so `git blame` skips the commit. See #250 for the full breakdown.
- **Root `lint` script** no longer shells out to `yarn workspaces foreach` (which would recurse through the root workspace); it runs `eslint .` against the new root config.
- **Backend `lint` script** no longer passes `--fix`. A linter that rewrites the tree cannot be a CI gate; `yarn workspace @chardb/backend lint:fix` does that job instead.
- **Frontend `lint` script** drops `--max-warnings 0`. Warnings are advisory under the new gate, which fails on errors only.
- **CI actions bumped off the deprecated Node 20 runtime**: `actions/checkout` and `actions/setup-node` to v7, `actions/cache` to v6, `actions/upload-artifact` to v7 — all now running on `node24`. GitHub had begun force-running the v4 actions on Node 24 with a deprecation warning. Note `setup-node@v5+` auto-caches when `packageManager` is present in `package.json`; the explicit `cache: yarn` is kept for clarity. (#235)

### Fixed

- Registered missing ToyHouse env vars in the backend Docker Compose service (was crash-looping the API). (#245)
- Wired ToyHouse OAuth vars through the dev (EC2) Terraform and `deploy.sh`, so the generated `.env` no longer drops them on deploy.

### Security

- **The dev/staging Postgres was reachable from the internet.** The EC2 security group opened `3000-8000` to `0.0.0.0/0`, a range that includes 5432, and `docker-compose.overrides.prod.yml` published the container on `0.0.0.0`. The database was protected by nothing but its password. The security group now opens only the backend port (4000, required because CloudFront fetches from this origin over plain HTTP), and Postgres is published on `127.0.0.1` only — use an SSH tunnel for admin access. Worth a follow-up: restrict 4000 to the AWS-managed `com.amazonaws.global.cloudfront.origin-facing` prefix list so only CloudFront edges can reach the origin.
- **The Jaeger UI was publicly exposed** on port 16686 to `0.0.0.0/0` with no authentication, making captured request paths, headers, user IDs and SQL browsable by anyone who found the address. The ingress rule is removed along with the service.

## [v10.1.0] - 2026-05-12

## [v10.0.0] - 2026-02-27

## [v9.3.0] - 2026-02-26

## [v9.2.1] - 2026-02-23

## [v9.2.0] - 2026-02-22

### Added

- **DeviantArt Import Tool** (`packages/da-import`): CLI tool for importing species masterlists from DeviantArt into CharDB
  - Multi-phase pipeline: download deviations, parse traits, download images, extract artist credits, import characters via GraphQL API
  - Configurable trait mapping file correlates DA text patterns to CharDB trait/enum IDs
  - Scaffold command auto-generates mapping config from downloaded data
  - Supports dry-run mode and idempotent re-runs (existing characters skipped by registryId)
  - Sets up pending ownership via DeviantArt usernames for automatic claiming
  - Reference images downloaded via oEmbed and uploaded with artist credit attribution
  - Characters enter the trait review queue after import for moderator verification
- **Trait Review System**: Moderation queue for reviewing character trait values after creation or import, with approve/revert/edit-and-approve workflow

## [v9.1.1] - 2026-02-09

## [v9.1.0] - 2026-02-09

## [v9.0.0] - 2026-02-09

## [v8.2.0] - 2026-02-09

## [v8.1.1] - 2026-02-08

## [v8.1.0] - 2026-02-08

## [v8.0.0] - 2026-02-01

### Added

- **Community Character List Page**: New dedicated character browsing page for communities
  - Route: `/communities/:communityId/characters` with automatic community sidebar integration
- **Item Type Detail Page**: Dedicated page for viewing item type details
  - Display item type information, description, and metadata
  - Links from admin item management and user inventory pages

### Changed

- **Character List UI Improvements**: Streamlined search and filtering interface
  - Removed species dropdown from basic search
  - Removed Gender and Species filters from advanced search
  - Removed visibility filter selector UI

### Fixed

- **Community Page Access**: Allow unauthenticated users to view community landing pages
- **Terraform Script Performance**: Optimize terraform outputs script with single JSON call instead of multiple invocations

## [v7.0.0] - 2025-11-13

## [v6.1.0] - 2025-11-06

## [v6.0.0] - 2025-11-03

## [v5.0.1] - 2025-11-02

### Fixed

- **Discord Guild Validation (#133)**: Fixed backend `validateDiscordGuild` query configuration issue

## [v5.0.0] - 2025-11-02

## [v4.2.0] - 2025-10-28

### Added

- **Community Color Palette System**: Community administrators can now create custom color palettes and assign colors to species entities for visual organization and branding
  - Colors can be assigned to Traits, Species Variants, Enum Values, and Item Types
  - Visual color pip indicators displayed throughout the application
  - Backend validation ensures colors can only be assigned within the same community
  - Database schema includes new `CommunityColor` table with proper foreign key relationships

## [v4.0.0] - 2025-10-26

### Changed

- **Character Text Fields (#109)**: BREAKING - Database migration removes `description`, `personality`, and `backstory` columns from characters table. All character details now use unified markdown `details` field with 15,000 character limit.

## [v3.0.0] - 2025-10-19

### Added

- **Community Item System** (#43): Virtual item management for communities
  - Community administrators can create item types and grant items to members
  - Users can view their community inventories with automatic item stacking
  - Support for stackable, tradeable, and consumable items with custom metadata
- **DeviantArt Account Linking** (#62): OAuth-based external account linking system
  - Link DeviantArt accounts to CloverCoin user profiles for ownership verification
  - Secure OAuth 2.0 Authorization Code flow implementation
  - Connected Accounts section in Edit Profile page
  - Backend external accounts module with GraphQL API
  - Database support for multiple external account providers (extensible for future platforms)
  - Automatic callback handling and account verification

## [v2.0.0] - 2025-09-01

### Added

- **UI Core Entity Management System**: Comprehensive administration interface for species, traits, and community management
  - Species management pages with creation, editing, and variant support
  - Trait builder system supporting ENUM, STRING, INTEGER, and TIMESTAMP value types
  - Community administration with role-based permissions and invite code management
  - Enum value configuration interface for species variant customization
  - Enhanced UI component library with Card, Modal, Input, Typography, and ErrorMessage components
- **Permission Management System**: Advanced role and permission administration interface
  - Visual permission matrix for comprehensive permission overview
  - Role editor with template support and granular permission control
  - Community member management with role assignment capabilities
  - Integrated permission management across all administrative interfaces
- Core entity migration from clovercoin-app including community system, species/trait management, and character ownership tracking
- Backend service layer refactoring to decouple from GraphQL types with field resolver patterns
- E2E testing agent specification for automated regression testing workflows

### Fixed

- Media type filter button visibility issues on character pages

### Changed

- Characters now use relational species instead of text field (breaking change)
- Enhanced Button component with improved styling and variant support

## [v1.1.3] - 2025-08-12

### Fixed

- Fix Discord notification script not firing

## [v1.1.2] - 2025-08-12

### Fixed

- Fix Discord notification script formatting issues with version headers and section formatting

## [v1.1.1] - 2025-08-12

### Changed

- Improve notify-release script to use jq for safer JSON payload creation

## [v1.1.0] - 2025-08-12

### Added

- Delete functionality for characters and media content

## [v1.0.0] - 2025-01-12

### Added

- Database migration to add `displayName` field to tags table
- Case-insensitive tag system to prevent duplicate tags with different cases

### Changed

- Eliminated legacy `tags String[]` field in favor of proper tag relationships

## [v0.2.0] - 2025-01-12

### Added

- Enhanced tag editing system with typeahead functionality and improved UX

## [v0.1.0] - 2025-01-11

### Added

- Tag editing functionality for characters after creation
- Reusable Tag and TagsContainer components with variant support
- Tag display in character lists (first 3 tags + overflow indicator)
- Tag display in character detail pages (all tags in dedicated section)
- Support for custom tag colors from backend
- Hover effects and accessibility features for tag components

### Fixed

- Missing tag editing capability in character edit form
- Inconsistent tag display across the application

### Changed

- Enhanced character edit form with Tags section matching create form styling
- Character detail page now supports both complex tag objects and simple tag arrays

## [v0.0.2] - 2025-08-10

### Added

- Discord release notification system for automated changelog updates
- GitHub Actions workflow for tag-triggered notifications
- CI scripts directory for deployment and notification automation

### Fixed

- Discord webhook JSON formatting and message rendering
- Proper newline handling in notification messages

## [v0.0.1] - 2025-08-10

### Added

- Initial release of CharDB platform
- Monorepo structure with backend and frontend applications
- CI/CD infrastructure setup
- Project documentation and deployment guides
- Changelog system for release tracking
