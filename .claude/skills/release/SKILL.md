---
name: release
description: Cut a release of the monorepo — bump every workspace's version, promote each CHANGELOG's Unreleased section, open the release PR, and (only when asked) publish the GitHub release that deploys to production. Use when asked to release, cut a release, bump the version, or publish/deploy a version to production.
---

# Release

You are conducting a release for this monorepo project. Follow this workflow carefully:

## Step 1: Verify Clean State
- Ensure you're on the main branch
- Ensure the working directory is clean (no uncommitted changes)
- Ensure main is up to date with origin/main

## Step 2: Check Current Version
- Read the root `package.json` to get the current version
- Display the current version to the user

## Step 3: Determine New Version
- Ask the user what type of release this is using the AskUserQuestion tool:
  - **Major** (Breaking changes, incompatible API changes)
  - **Minor** (New features, backwards-compatible)
  - **Patch** (Bug fixes, backwards-compatible)
- Calculate the new version number based on semantic versioning:
  - Major: x.0.0 (increment x, reset y and z to 0)
  - Minor: x.y.0 (increment y, reset z to 0)
  - Patch: x.y.z (increment z)
- Display the new version number to the user for confirmation

## Step 4: Create Release Branch
- Create and checkout a new branch: `release/v{new-version}`
- Example: `release/v4.2.0`

## Step 5: Update Package Versions
Update the version field in ALL package.json files to the new version:
- Root: `/package.json`
- Backend: `/apps/backend/package.json`
- Frontend: `/apps/frontend/package.json`
- E2E: `/apps/e2e/package.json`
- Database: `/packages/database/package.json`
- Shared: `/packages/shared/package.json`
- UI: `/packages/ui/package.json`
- DA import: `/packages/da-import/package.json`
- ESLint style rules: `/packages/eslint-plugin-styles/package.json`

Nine files. Confirm the list rather than trusting it — a package added since
this was written would be missed:
`grep -rn '"version"' --include=package.json . | grep -v node_modules`

Use the Edit tool to update each file's version field.

## Step 6: Update CHANGELOGs
Update ALL CHANGELOG.md files to move unreleased changes to the new version:

For each CHANGELOG:
1. Replace `## [Unreleased]` section with:
```markdown
## [Unreleased]

## [v{new-version}] - {current-date}
```
2. Keep all the changes that were under Unreleased
3. Use format: `YYYY-MM-DD` for the date

Files to update:
- Root: `/CHANGELOG.md`
- Backend: `/apps/backend/CHANGELOG.md`
- Frontend: `/apps/frontend/CHANGELOG.md`
- E2E: `/apps/e2e/CHANGELOG.md`
- UI: `/packages/ui/CHANGELOG.md`

Five files. Confirm the list with `git ls-files '*CHANGELOG.md'`, and skip any
whose Unreleased section is empty.

### Check for duplicate headings first

A release promotes `[Unreleased]` verbatim, so anything wrong in it ships. Two
branches that each added their own `### Added` leave the merged file with two,
and a released version with two `### Added` sections looks broken. This has
happened more than once.

For each file:

```
awk '/^## \[Unreleased\]/{p=1;next} /^## \[v/{exit} p' CHANGELOG.md | grep '^### ' | sort | uniq -c
```

Consolidate any repeats before adding the version heading. Count the bullets
(`grep -c '^- '`) before and after so the merge is provably lossless — the goal
is to move entries, never to drop or reword them. Do not rewrite other people's
entries beyond merging the sections.

## Step 7: Commit Changes
- Stage all modified package.json and CHANGELOG.md files
- Create a commit with message: `chore(release): bump version to v{new-version}`

## Step 8: Push and Create PR
- Push the release branch to origin
- Create a pull request using gh CLI with:
  - Title: `v{new-version}`
  - Body describing the release (summarize key changes from CHANGELOGs)
  - Target: `main` branch

### The squash commit is named for the tag

When the release PR is squashed into main, the commit header must be exactly
`v{new-version}` — no `Release`, no `chore(release):`, no ` (#NNN)` suffix.
GitHub's default squash subject appends the PR number, so the title alone is
not enough. Merge with:

```
gh pr merge {pr-number} --squash --subject "v{new-version}"
```

or replace the subject by hand in the web UI's squash dialog.

## Step 9: Final Output
Display to the user:
- New version number
- Release branch name
- PR URL
- Next steps: "Squash-merge the PR with the commit header `v{new-version}`
  (`gh pr merge {pr-number} --squash --subject "v{new-version}"`). Once its
  staging deploy is green, publish the release with
  `gh release create v{new-version}`"

## Step 10: Publish the release (deploys to production)

**Only when the user asks for it.** Merging the PR deploys to staging on its own;
publishing the release is what deploys to **production**, so it needs the user to
say so.

Do NOT create the tag by hand. `.github/workflows/release.yml` triggers on
`release: published`, so a pushed tag with no release attached deploys nothing.
`gh release create` makes the tag and the release together:

```
gh release create v{new-version} --title "v{new-version} — {short feature name}" --notes-file {file}
```

Before running it:

- **Main's tip must be the release commit**, and its staging deploy must be
  green. Production promotes the image staging already ran rather than building
  a new one, so releasing a commit staging has not deployed has nothing to
  promote. After a fresh fetch, `git log -1 --format=%s origin/main` must print
  exactly `v{new-version}`.
- **Write the notes for members, not for engineers.** Look at the previous
  release for register (`gh release view v{previous}`): what changed for someone
  using the site, grouped under "What's new" and "Fixed", not a list of PRs.
  Read every PR merged since the last release, not just their titles.
- **Say whether there are database migrations.** They run automatically from the
  container entrypoint under `set -e`, so a migration failure kills the
  container and fails the deploy rather than half-migrating.

To redeploy a release that already exists, use
`gh workflow run release.yml -f tag=v{version}` rather than cutting a new one.

## Important Notes
- DO NOT make any code changes during the release process
- DO NOT update dependency versions - only the package version field
- If any step fails, inform the user and stop the process
- Always confirm with the user before proceeding with destructive operations
