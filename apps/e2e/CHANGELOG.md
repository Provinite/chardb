# E2E Changelog

All notable changes to the browser end-to-end suite will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Signed-out public page specs**: a public gallery and a public character opened with no session, asserted through both the page and the API, each selecting the non-nullable `userHasLiked` that broke them. (#173)
- **Owner-filtered listing specs**: the profile's "View All" reaching that member's characters rather than everyone's, and the visibility matrix behind it — owner, other member, signed out — asserted through both the page and the API. (#321)
- **Deferral specs for both review queues**: the trait review queue's reorder driven through the browser, and the image queue's cross-relation ordering exercised against real Postgres — the one claim a mocked Prisma client cannot make. (#333)
- **Initial suite**: Playwright driving real Chromium against the production frontend bundle and a real backend. `yarn workspace @chardb/e2e e2e` starts the test Postgres, creates and migrates a dedicated `chardb_e2e_ui` database, boots the backend (:4310) and frontend (:4311), seeds, runs, and tears down — nothing needs to be running first. (#235)
- **Seeding presets** (`src/world/presets/`): named worlds built by creating users directly via Prisma (the only way to grant global permission flags, since `signup` requires an invite code and grants none), then building everything else through the GraphQL API *as those users*, so a preset exercises real authorization and cannot construct a state the app itself could not reach. `ctx.user()` both creates and registers a persona, which makes `as()`, token minting, and `storageState` generation automatic. Ships `community-basic`, covering the #235 permission matrix. (#235)
- **Snapshot/restore reset** (`src/db/snapshot.ts`): the world is seeded once and copied into a parallel Postgres schema, then restored in ~66ms — per spec file by default, per test via `world.reset()`. Restoring rows rather than re-seeding keeps UUIDs stable, so auth state and `a[href="/character/<uuid>"]` selectors stay valid for a whole run. Uses `SET LOCAL session_replication_role = 'replica'` because every FK in the schema is `NOT DEFERRABLE` and the FK graph contains cycles, so no topological insert order exists. (#235)
- **Generated GraphQL** (`src/world/operations/*.graphql`): `graphql-codegen` validates every operation against the committed schema and emits `TypedDocumentNode`s, so result and variable types are inferred rather than hand-written. A renamed field fails `yarn type-check` — which the repo's existing CI already runs — instead of failing mid-suite. The generated file is gitignored; every entry point regenerates it first, so it cannot go stale and needs no drift check. (#235)
- **Specs**: a smoke suite (UI login per persona, browse, character detail) and coverage for the three #235 flows — the admin action strip's permission matrix, character deletion, species removal with trait flattening, and the trait review queue's inline actions. (#235)
- **Agent entry point**: `yarn workspace @chardb/e2e world <preset> --json` prints a seeded world's ids, URLs, and credentials. Only JSON goes to stdout, so it pipes into `jq`. (#235)
- **CI job**: runs on every pull request and push to `main`, in parallel with the type-check job. Starts its own Postgres via `docker/compose.test.yml` rather than a GitHub service container, so a CI failure reproduces locally with the same command. (#235)

### Notes

- Assertions go through the UI or the GraphQL API, never the database. Implementation details — that a delete is *soft*, that `traitValues` was emptied — are covered in `apps/backend/src/characters/characters.service.spec.ts`, where they sit next to the code they describe. `README.md` documents the rule and maps each behavior to the spec that owns it.
- `workers: 1` deliberately. Ports and the database name are already offset by `TEST_PARALLEL_INDEX`, so raising it is a config change — but a per-worker database *partitions* state rather than isolating tests within a worker. Per-test isolation comes from `world.reset()`.
