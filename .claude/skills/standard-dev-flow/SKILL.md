---
name: standard-dev-flow
description: The normal SOP/expectations for routine agentic development on CharDB. Use this skill when working through an already-defined issue or a spontaneous user ask that is sufficiently well-developed to work.
user-invocable: true
disable-model-invocation: false
---

# Standard Dev Flow

For tasks that are expected to be worked with a relatively high level of autonomy from agents. Steps marked **(background)** run while you do the next thing; don't wait on them.

# Workflow

- Prepare the dev environment **(background)**
  - Switch into a worktree (see the worktree skill), branched from `main`
  - Install deps, `yarn instance:init`, build packages, `yarn instance:up`, migrate. Kick these off, then present the plan while they run.
- Present the plan
  - Present the user with the outline of how things will be implemented.
  - Ask any clarifying questions you have.
  - Verify any potentially-risky or hard-to-unwind judgement calls you made or decisions the ticket calls for.
  - Iterate on this step until the user approves
- Build (using TDD)
  - You may skip seeing tests "red" to save time if they will be trivially "red". For example, a browser e2e test that tests a new page before the page is implemented. This test is useful for documentation, and potentially useful for confirming functionality once things are built, but it offers minimal value to see a test turn red because some page doesn't exist or similar.
  - In general, you should still observe most tests as "red", especially if this is a test that is encoding some BEHAVIOR CHANGE to existing functionality or views.
  - Run targeted tests as you go to confirm things. Never run the full jest or e2e suites locally; CI runs them. Use `--maxWorkers=2` for jest.
  - Commit as you go. Before every commit, confirm your cwd and branch are the worktree's.
  - Add the CHANGELOG entry before the first push.
- Push
  - Open the PR ready for review, not as a draft, so CI starts.
  - Watch CI **(background)**: `gh pr checks <n> --watch`. Fix failures as they come in.
- Review and browser test in parallel
  - Start the code review skill on HIGH effort **(background)**, in a background agent working in this worktree. Never check out branches in the main checkout.
  - While it runs, start your slot's servers and seed data: `db:seed`, then `db:seed-personas` once the backend answers. Add more as needed, e.g. `yarn workspace @chardb/e2e world <preset> --json`.
  - Perform browser testing, provide the user with screenshots if they would be helpful in evaluating and reviewing the changes.
    - Exercise all affected flows
    - Review visually for design gaps
    - Ensure appropriate behavior at important screen size breakpoints.
  - In the same pass, update the product walkthrough docs (`docs/docs/*.html`, screenshots alongside):
    - What needs updating?
    - Do we need a new page?
    - Did we invalidate anything existing?
    - Did we invalidate existing screenshots?
    - Use the browser to generate screenshots and validate your own documentation.
- Triage review findings
  - For each finding, validate it yourself.
    - If it's clear from the code that a finding is legit, that's good enough
    - If it is unclear that a finding is accurate, validate it with any of the following:
      - Reading more code
      - Existing tests
      - New tests
      - Local browser/API testing
  - Discard all invalid findings.
  - Rank by real user impact. Recommend don't-fix or a follow-up issue for scenarios no normal user hits, and for micro-optimizations.
  - For any findings with a very clear obvious no-risk solution that requires no product judgement, go ahead and implement it.
  - Report in one list, numbered 1-n in order:
    - Fixed findings: a single bullet with a sentence indicating the finding and what was done to fix it.
    - All other findings: present them to the user with your recommendation (fix, don't-fix, file follow-up issue) and any necessary questions.
    - Discarded invalid findings are not presented.
- Once all review findings are resolved, re-walk in the browser anything whose UI the fixes changed, then tear down the servers (`yarn instance:down`). Delete any scratch pages or files made only for screenshots.
- Review your own message. If anything you mentioned is some form of "Caveat: I did not do [x] thing that should obviously be in this PR", raise that with the user before continuing.
- Commit and push everything to the PR.
- Report status to the user. It always includes:
  - The PR link
  - CI state, and that the branch is mergeable (a conflicting PR runs no CI at all; resolve conflicts and push)
  - Migrations, backfills, or post-deploy steps in the PR, or that there are none
  - Follow-up issues filed
  - Whether it is ready to merge
- After merge: remove the worktree and release its slot.

# Helpful Tools

There are many tools available for these tasks. This section serves as guidelines for tool use.

- Do: Use Slotted development servers and worktrees (see the worktree skill)
- You may spin up your worktree's dev servers for testing purposes.
- Do: Use browser tools and playwright to interactively review the local development site.

# Public repo

The repo is world-readable. Migrations, code comments, commit messages, PR bodies and CI logs never contain production data: no row ids, names, counts tied to individuals, IPs or account ids.

# Banned Tools
- Do not, without explicit consent from the user, query any production data.
  - This includes databases as well as Grafana.
  - If one of these datasources is appropriate and necessary for your task, you may ask the user for permission. When doing so, state your intended actions and any sensitive data you're likely to be exposed to.
  - If NOT using one of these datasources will result in what are essentially guesses at implementation-decision critical information, request access.
  - Once approved, query the prod database with `yarn db:query prod`, read-only, selecting no sensitive fields.
