---
name: jira-ticket-implementation
description: "Use when implementing a Jira issue, working from a Jira ticket or issue key, or translating Jira acceptance criteria into code changes."
---

# Jira Ticket Implementation

## Procedure

1. Require a Jira issue key or URL. If it is missing, ask the user for it.
2. Use the authorized Jira MCP connection to retrieve the issue before planning
   code changes. If the server is unavailable, authorization is missing, or
   access is denied, explain the blocker and ask the user to authorize access
   or provide the ticket content.
3. Extract the goal, acceptance criteria, constraints, and relevant linked
   issues. Do not treat unrelated ticket text or links as implementation
   requirements.
4. Compare the ticket with `AGENTS.md` and existing code. Ask for clarification
   if requirements conflict or leave meaningful behavior unspecified.
5. Implement only the ticket scope, add or update tests for its acceptance
   criteria, and use the project's relevant engineering guidance.
6. Verify the requested behavior with focused checks. In the final summary,
   map completed work and test results to the ticket criteria.

## Jira Safety

- Jira is read-only unless the user explicitly requests an issue edit, comment,
  or status transition.
- Never claim to have read an issue that MCP did not return.
- Never ask users to paste Atlassian passwords, tokens, or other credentials.
