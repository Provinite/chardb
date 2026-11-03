---
name: issue
description: Work on a GitHub issue in the current checkout. Takes the issue number as its argument.
argument-hint: <issue-number>
disable-model-invocation: true
---

# Work on GitHub Issue

Time to get to work on GitHub issue #$ARGUMENTS!

## Workflow

### Step 1: Read the Issue

- Use `gh issue view $ARGUMENTS --comments` to read the issue title, body, and all comments
- Understand the full context of what's needed
- Identify any acceptance criteria, implementation notes, or special requirements

### Step 2: Use Sequential Thinking (#ultrathink)

- Use the sequential thinking tool (mcp**sequential-thinking**sequentialthinking) to analyze the requirements
- Break down the problem systematically
- Identify key components that will need to be modified or created
- Consider edge cases and potential challenges

### Step 3: Examine the Codebase

- Search for relevant existing code that this feature relates to (similar features, related modules, etc.)
- Understand the current architecture and patterns used
- Identify all files that will need to be modified or created
- Look at similar implementations for consistency
- Be thorough - examine as much of the codebase as necessary to develop a complete understanding

### Step 4: Develop Implementation Plan

- Create a detailed, unambiguous implementation plan using the TodoWrite tool
- The plan should include:
  - Specific files to create or modify
  - Database schema changes (if needed)
  - API endpoints to add or modify (if applicable)
  - Frontend components to create or update (if applicable)
  - Testing considerations
  - Any migration steps required
- Break down complex tasks into concrete, actionable steps
- Ensure the plan is essentially free from ambiguity

### Step 5: Clarify Ambiguities

- If there are any questions, unclear requirements, or multiple valid approaches, use the AskUserQuestion tool
- Ask about:
  - Architectural decisions where multiple approaches are valid
  - Specific implementation details not covered in the issue
  - User preferences for UX/UI decisions
  - Any assumptions that need validation

### Step 6: Present the Plan

- Present your complete implementation plan to the user
- Highlight any key architectural decisions
- Note any potential risks or challenges
- Wait for user approval before proceeding with implementation

## Important Notes

- Be thorough in your codebase examination - don't rush this step
- Use the Explore agent (Task tool with subagent_type=Explore) for broad codebase exploration
- Look for existing patterns and follow them for consistency
- The plan should be detailed enough that implementation can proceed without ambiguity
- Always use the sequential thinking tool to ensure thorough analysis
- Work should be done on a new branch from the tip of main, including `gh-XX` in the branch name.