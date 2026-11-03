---
name: standard-dev-flow
description: The normal SOP/expectations for routine agentic development on CharDB. Use this skill when working through an already-defined issue or a spontaneous user ask that is sufficiently well-developed to work.
user-invocable: true
disable-model-invocation: false
---

# Standard Dev Flow

For tasks that are expected to be worked with a relatively high level of autonomy from agents.

# Workflow

- Prepare the dev environment
  - Switch into a worktree
  - Install deps
  - Build packages
- Present the plan
  - Present the user with the outline of how things will be implemented.
  - Ask any clarifying questions you have.
  - Verify any potentially-risky or hard-to-unwind judgement calls you made or decisions the ticket calls for.
  - Iterate on this step until the user approves
- Build (using TDD)
  - You may skip seenig tests "red" to save time if they will be trivially "red". For example, a browser e2e test that tests a new page beore the page is implemented. This test is useful for documentation, and potentially useful for confirming functionality once things are built, but it offers minimal value to see a test turn red because some page doesn't exist or similar.
  - In general, you should still observe most tests as "red", especially if this is a test that is encoding some BEHAVIOR CHANGE to existing functionality or views.
  - Run targetted tests as you go to confirm things.
- Test
  - Push the PR to GitHub so CI starts
  - Start your slot's servers
  - Seed default data
  - Seed additional data as-needed
  - Perform browser testing, provide the user with screenshots if they would be helpful in evaluating and reviewing the changes.
    - Exercise all affected flows
    - Review visually for design gaps
    - Ensure appropriate behavior at important screen size breakpoints.
- Review
  - Run the code review skill on HIGH effort
  - For each finding, validate it yourself.
    - If it's clear from the code that a finding is legit, that's good enough
    - If it is unclear that a finding is accurate, validate it with any of the following:
      - Reading more code
      - Existing tests
      - New tests
      - Local browser/API testing
  - Discard all invalid findings.
  - For any findings with a very clear obvious no-risk solution that requires no product judgement, go ahead and implement it.
  - Once those findings are addressed, report in two groups:
    - For fixed findings, present a single bullet with a sentence indicating the finding, and what was done to fix it.
    - For discarded invalid findings, do not present them.
    - For all other findings, present them to the user and include your opinion and recommended plan, as well as any necessary questions.
  - Always number items in this report 1-n in order.
- Once all review findings are resolved, inform the user of the overall status.
- Review your own message. If anything you mentioned is some form of "Caveat: I did not do [x] thing that should obviously be in this PR", raise that with the user before continuing.
- Review the existing product walkthrough documentation.
- Create a plan of product walkthrough updates:
  - What needs updating?
  - Do we need a new page?
  - Did we invalidate anything existing?
  - Did we invalidate existing screenshots?
- Execute on that plan, using the browser to generate screenshots and validate your own documentation.
- Ensure the changelogs are updated appropriately.
- Commit and push everything to the PR
- Notify the user you are complete

# Helpful Tools

There are many tools available for these tasks. This section serves as guidelines for tool use. 

- Do: Use Slotted development servers and worktrees (see the worktree skill)
- You may spin up your worktree's dev servers for testing purposes.
- Do: Use browser tools and playwright to interactively review the local development site.

# Banned Tools
- Do not, without explicit consent from the user, query any production data.
  - This includes databases as well as Grafana.
  - If one of these datasources is appropriate and necessary for your task, you may ask the user for permission. When doing so, state your intended actions and any sensitive data you're likely to be exposed to.
  - If NOT using one of these datasources will result in what are essentially guesses at implementation-decision critical information, request access.
