# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Continuous deployment to staging** (`deploy-backend` and `deploy-frontend` jobs in `.github/workflows/ci.yml`): a push to `main` that passes `lint`, `verify` and `e2e` builds the backend image, deploys it to the staging docker host, then rebuilds and publishes the frontend — the same `scripts/build-and-push.sh` → `deploy.sh` → `build-frontend.sh` → `deploy-frontend.sh` chain that `deploy-fullstack.sh` runs by hand, so a CI failure reproduces locally. The backend image is built on `ubuntu-24.04-arm` because the host is a Graviton `t4g.micro` and QEMU emulation turns a few minutes into tens of them. Images are tagged `v-<commit sha>` rather than `latest`, so what is running on the host traces back to a commit; the `v-` prefix is load-bearing, since the ECR lifecycle policy expires all but the last 10 images whose tag starts with `v`. The frontend is sequenced after the backend rather than run in parallel, so a bundle never ships expecting a schema the deployed API does not have yet.
- **OIDC deploy role** (`infra/modules/github-actions-deploy`): GitHub Actions assumes an IAM role through federated identity rather than holding an access key. This repository is public, so a long-lived credential in repository secrets would be one misconfigured workflow away from exfiltration; a federated token is minted per job and its trust policy pins the OIDC `sub` claim to `repo:<owner>/<repo>:ref:refs/heads/main`, which is what stops a fork's pull request from assuming it. The attached policy grants exactly what the deploy chain needs — push to the backend ECR repository, **read-only** access to this environment's Terraform state, publish and invalidate the frontend, and open a Session Manager session to the docker host. It cannot run `terraform apply`; changing infrastructure stays a human action. Note the jobs deliberately do not declare `environment:`, which would rewrite the `sub` claim to `repo:<owner>/<repo>:environment:<name>` and no longer match.
- **CI `lint` job**: runs ESLint and `prettier --check` on every pull request and push to `main`. Scoped to the files a change touches (`yarn lint:changed`, diffed against the merge base), because the repo had no working lint setup to inherit from — both apps carried a `lint` script but no config file, and ESLint's "couldn't find a configuration file" error exits 0 through Yarn, so the scripts had been silently passing. A repo-wide gate would have started life failing on 334 pre-existing errors; this holds new and modified code to the full rule set instead. Note the scope is per file, not per line: touching one line of a file surfaces every violation in it. Commits listed in `.git-blame-ignore-revs` are excluded when working out what changed, so a mechanical tree-wide commit does not drag the entire repo into the changed set.
- **ESLint config** (`.eslintrc.cjs`): one root config for the whole monorepo rather than one per workspace, so `packages/*` is covered too instead of being silently skipped. `eslint:recommended` + `@typescript-eslint/recommended` (the non-type-checked preset — `yarn type-check` already covers what the type-aware rules would catch), with `react-hooks` and `react-refresh` overrides for `apps/frontend` and `packages/ui`, and `eslint-config-prettier` last to stand down the stylistic rules.
- **Prettier config** (`.prettierrc.json`, `.prettierignore`): defaults, plus `endOfLine: lf` to match `.editorconfig`. Markdown, JSON and YAML are ignored deliberately — formatting them would churn large documents for no review benefit.
- `yarn lint:changed`, `yarn lint:fix`, `yarn format` and `yarn format:check` at the repo root.
- **Browser E2E suite** (`apps/e2e`): Playwright driving real Chromium against the production frontend bundle and a real backend. Playwright's `webServer` brings up the test Postgres, creates and migrates a dedicated `chardb_e2e_ui` database, and boots both apps on ports 4310/4311. GraphQL operations are generated with `graphql-codegen` from the committed schema, so documents are schema-validated and both result and variable types are inferred. Seeding uses named presets (direct-Prisma users, then the GraphQL API as those users) with a typed escape hatch, and state resets between spec files via a Postgres snapshot schema in ~66ms. `yarn workspace @chardb/e2e world <preset> --json` prints a seeded world's ids, URLs and credentials for driving the app by hand. (#235)
- **E2E test Postgres service**: `docker/services/postgres-test.yml` and `docker/compose.test.yml` provide an isolated Postgres container on port 5440, started by the Jest global setup for backend e2e runs and reused by the browser suite. The container is deliberately left running between runs (it uses tmpfs, so it holds no state); stop it with `docker compose -f docker/compose.test.yml down`. (#235)
- **Docs walkthrough**: `docs/docs/character-deletion.html` documents character deletion and species removal with screenshots, linked from the docs index. (#235)
- **ToyHouse OAuth account linking**: Full OAuth2 integration allowing users to link their ToyHouse accounts to CharDB for identity verification and pending ownership auto-claim. Includes Passport strategy, controller, frontend callback page, Terraform secrets management, and a Prisma migration adding `TOYHOUSE` to `ExternalAccountProvider`. (#242)
- `scripts/restart-dev-server.sh`: recovers the dev EC2 docker host, looking up its instance ID from the `Name` tag. Performs a stop/start rather than a reboot — see the note under Changed.
- `scripts/ensure-swap.sh`: creates a persistent 2 GB swapfile on the dev docker host. Idempotent, and mirrored in the EC2 module's `user_data.sh` so a rebuilt instance gets the same setup on first boot. Uses `dd` rather than `fallocate` because the root filesystem is XFS and `swapon` rejects files with unwritten extents.
- `packages/da-import/scripts/excluded-to-discord.ts`: renders `data/excluded.json` as Discord-ready markdown grouped by exclusion reason.
- **CI `e2e` job**: runs the browser E2E suite on every pull request and push to `main`, in parallel with the type-check job. Starts its own Postgres via `docker/compose.test.yml` rather than a GitHub service container, so a CI failure reproduces locally with `yarn workspace @chardb/e2e e2e`. Caches Chromium keyed by Playwright version, retries once in CI only, and uploads the HTML report plus traces on failure. (#235)
- **CI workflow** (`.github/workflows/ci.yml`): runs `yarn type-check` on every pull request and fails if the committed GraphQL codegen output differs from a fresh regeneration. The repo previously had no PR checks, which let a non-compiling `main` land.

### Changed

- **Application secrets moved to SSM Parameter Store.** Prod's eight Secrets Manager secrets are replaced by parameters under `/chardb/prod/`, and dev gains the equivalent under `/chardb/dev/`. Terraform creates each parameter with a placeholder and then ignores its value, so rotating an OAuth secret is one `aws ssm put-parameter` with no Terraform run and no plan diff. Previously these were declared as Terraform *input variables* sourced from a gitignored `.tfvars` and then re-exported as *outputs*: state was their only durable record and the tfvars file was a hand-maintained cache of Terraform's own output, so only the one machine holding that file could apply, and a secret rotated in a provider's dashboard drifted silently. Five now-unreferenced variables are deleted from prod, so `prod.tfvars` no longer needs them — the lines can be removed from your local copy. Parameter Store's Standard tier is also free where Secrets Manager bills $0.40 per secret per month. **Applying this to prod requires copying the live secret values across first**, or the task definition will start injecting `not-managed-by-terraform`; the runbook is in DEPLOYMENT_GUIDE.md. In dev the parameters are created but nothing reads them yet — the deploy still renders the host's `.env` from Terraform outputs.
- **Deploys reach the staging host by tunnelling SSH over Session Manager** rather than connecting to its public IP. `AmazonSSMManagedInstanceCore` is attached to the instance role, and `deploy.sh`/`scripts/ssh-dev.sh` address the host by instance id through an `aws ssm start-session` `ProxyCommand`. The tunnel emerges on the instance's own loopback, so GitHub Actions can deploy without the security group ever naming a runner IP — the alternative would have been opening port 22 to the internet or churning a security group rule around every job. It also means `ssh-dev.sh` now works from any machine with AWS credentials, not only from an address listed in `backend_ssh_allowed_cidr_blocks`. **Requires `session-manager-plugin` installed locally** (see DEPLOYMENT_GUIDE.md); if the SSM agent is unhealthy, `DEPLOY_TRANSPORT=direct` falls back to connecting over the public IP, which still needs your address in `backend_ssh_allowed_cidr_blocks`.
- **A run on `main` is no longer cancelled by a newer push.** The workflow's `cancel-in-progress` is now conditional on the ref: a superseded pull request push is still cancelled, but a run on `main` ends in a deploy, and cancelling mid-flight can leave the host with images pulled and no containers running. Runs on `main` queue instead, and the deploy jobs additionally hold their own non-cancelling concurrency group so two deploys never touch the host at once.
- **Dev/staging docker host no longer runs Jaeger or the OTEL collector.** `docker/docker-compose.prod.yml` now includes only Postgres and the backend, and the deploy sets `OTEL_SDK_DISABLED=true`.

  The host is a `t4g.micro` with ~910 MB usable RAM and **no swap** — Amazon Linux 2023's zram-generator only creates zram swap at ≤ 800 MB, so this instance falls in a gap and gets none (`zram0: system has too much memory (910MB), limit is 800MB, ignoring`). Onto that, the prod compose put four containers with no memory limits, including Jaeger all-in-one with default in-memory span storage and no `MEMORY_MAX_TRACES` — unbounded by design. Measured on a developer machine, the same image at the same config reached **772 MB after 13 days** and was still growing.

  The result was a deterministic ~2-day fuse. Console-log evidence from the current boot (2026-07-08 01:55 UTC): container create/destroy churn — the OOM killer versus `restart: unless-stopped` — concentrated entirely between uptime day 2.17 and 2.62, peaking at 312 events in ~15 minutes on 2026-07-10 16:33 UTC, after which the kernel logged nothing but journald rotation for 49 days. `NetworkOut` went to exactly 0 bytes/day on 2026-07-10 and stayed there, while CPU held at a flat ~1.5% and EBS writes continued — a kernel alive but unable to transmit, which is what an out-of-memory livelock with no swap looks like. Over the preceding 180 days the instance transmitted on only 9 of them.

  Tracing is unchanged for local development (`docker/compose.yaml` still includes both services), which is where it was actually used.
- **`scripts/restart-dev-server.sh` now stops and starts the instance instead of rebooting it.** `aws ec2 reboot-instances` sends an ACPI shutdown request *to the guest*; a guest wedged by memory exhaustion cannot service it, so the reboot silently did nothing while the script still reported success. Uptime confirmed no reboot had taken effect for 49 days despite the script being run. Stop/start is performed by the hypervisor and relocates the instance to healthy hardware. The Elastic IP survives it, so the address does not change.
- **Memory limits on the deployed containers**: `mem_limit` of 512m (backend) and 256m (postgres) in `docker/docker-compose.overrides.prod.yml`, so a runaway process is killed inside its container rather than leaving the kernel to pick a victim such as `sshd`. Docker defaults `memswap_limit` to twice `mem_limit`, so this also gives the `prisma migrate deploy` entrypoint room to spill into swap rather than being OOM-killed mid-deploy. Note these are `mem_limit`, not `deploy.resources.limits.memory`, which `docker compose up` silently ignores outside swarm mode.
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
