---
name: issue-worktree
description: Work on a GitHub issue in its own worktree, following standard-dev-flow. Takes the issue number as its argument.
argument-hint: <issue-number>
disable-model-invocation: true
---

# Work on GitHub Issue (in a worktree)

Time to get to work on GitHub issue #$ARGUMENTS!

Invoke the `standard-dev-flow` skill and follow it. It owns the worktree setup, plan, build, review and cleanup. This skill adds only what is specific to an issue.

## Before the plan

While the environment setup runs in the background:

- Name the worktree after the issue with `EnterWorktree` (e.g. `gh-$ARGUMENTS-short-slug`). It names the branch after the worktree; rename the branch to include `gh-$ARGUMENTS` (e.g. `fix/gh-$ARGUMENTS-short-slug`).
- Read the issue with `gh issue view $ARGUMENTS --comments`: title, body, every comment, acceptance criteria, implementation notes.
- Use the sequential thinking tool (mcp**sequential-thinking**sequentialthinking) to break the problem down and find edge cases.
- Examine the codebase: related features, existing patterns to follow, every file that will change. Use the Explore agent for broad sweeps.

## In the plan

Cover the issue's acceptance criteria point by point, plus schema changes, API changes, frontend changes, tests and migration steps. Ask about anything the issue leaves ambiguous with AskUserQuestion.

## In the PR

Link the issue in the PR body (`Closes #$ARGUMENTS`).
