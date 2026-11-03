---
name: issue
description: Work on a GitHub issue following standard-dev-flow, in its own worktree by default. Takes the issue number, plus optional `main-checkout` to work in the current checkout instead.
argument-hint: <issue-number> [main-checkout]
disable-model-invocation: true
---

# Work on GitHub Issue

Arguments: `$ARGUMENTS`. The first is the issue number. If `main-checkout` is among them, work in the current checkout instead of a worktree.

Invoke the `standard-dev-flow` skill and follow it. It owns the setup, plan, build, review and cleanup. This skill adds only what is specific to an issue.

## Before the plan

While the environment setup runs in the background:

- Worktree (default): name it after the issue with `EnterWorktree` (e.g. `gh-<n>-short-slug`). It names the branch after the worktree; rename the branch to include `gh-<n>` (e.g. `fix/gh-<n>-short-slug`).
- `main-checkout`: create the branch in place from the tip of `main`, with the same naming.
- Read the issue with `gh issue view <n> --comments`: title, body, every comment, acceptance criteria, implementation notes.
- Use the sequential thinking tool (mcp**sequential-thinking**sequentialthinking) to break the problem down and find edge cases.
- Examine the codebase: related features, existing patterns to follow, every file that will change. Use the Explore agent for broad sweeps.

## In the plan

Cover the issue's acceptance criteria point by point, plus schema changes, API changes, frontend changes, tests and migration steps. Ask about anything the issue leaves ambiguous with AskUserQuestion.

## In the PR

Link the issue in the PR body (`Closes #<n>`).
