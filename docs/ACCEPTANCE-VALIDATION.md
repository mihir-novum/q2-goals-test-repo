# Q2 Goals Demo: Acceptance Validation

This repository is a disposable public demo for validating the AI SDLC goals.
It contains no production credentials. Never use a real secret as a test
fixture; use a synthetic canary only.

## Current evidence

| Goal                                                         | Acceptance evidence                                                                                                                                                                  | Status                                                                                           |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| Fresh clone and runnable project in under 30 minutes         | Record a clean-clone install/build/dev-server time and obtain an independent first-time tester's elapsed time.                                                                       | In progress                                                                                      |
| At least two MCP integrations working and documented         | GitHub MCP successfully queried this demo repository; Atlassian MCP successfully returned authorized resources for the configured Jira site. Setup is documented in `docs/SETUP.md`. | Verified for the current operator; new-clone/second-user authorization still needs verification. |
| Push and PR enforcement                                      | Enable required status checks; test local pre-push rejection and GitHub PR merge blocking for each failing check.                                                                    | Pending ruleset and test runs                                                                    |
| 8–10 deliberately failing changes including a planted secret | Use a synthetic canary only; retain PR/check-run URLs and confirm there is no approval/merge.                                                                                        | Not run                                                                                          |
| Named, logged bypass                                         | Demonstrate a pre-approved bypass with approver identity, reason, timestamp, and durable audit record; verify an unapproved attempt is rejected.                                     | Not implemented/verified in demo yet                                                             |
| 15+ passing PRs auto-approved without human action           | After configuring an isolated GitHub App and secrets, record PR, head SHA, all gate results, App review, and merge eligibility for each trial.                                       | Blocked on GitHub App setup                                                                      |
| Failing PRs are never auto-approved                          | For every failing trial, capture failed check and absence of approval; include stale-head, draft, fork, and sensitive-path cases.                                                    | Not run                                                                                          |
| Human-review stage toggles per repository                    | Test policy enabled and disabled in separate controlled runs. A change to trusted policy takes effect after it is on the default branch.                                             | Not run                                                                                          |

## Test safety and evidence to retain

- Run only in this disposable demo repository; do not run deliberate failure
  trials against the template or a production repository.
- All test credentials must be fake and non-functional. Use a synthetic secret
  canary recognized by the scanner; never commit a real API key or password.
- Do not merge failing PRs. Close the trial PRs after the checks and review
  behavior have been recorded.
- Record each trial's scenario, branch/PR URL, tested commit SHA, check results,
  approval state, human-review state, and timestamp in a separate evidence
  ledger.
- Configure real branch protection and automation credentials only after
  reviewing the workflow permissions. The CI workflow is read-only; PR
  automation is privileged and must continue to use the trusted default-branch
  workflow and policy.

## Required setup before automation trials

1. Confirm the repository owner and `main` default branch.
2. Add the repository ruleset with all six exact required check names.
3. Configure a repository-scoped GitHub App and add
   `PR_AUTOMATION_APP_ID` and `PR_AUTOMATION_APP_PRIVATE_KEY` as Actions
   secrets.
4. Configure `COPILOT_GITHUB_TOKEN` only if AI summaries are part of the
   demonstration.
5. Confirm `PR_AUTOMATION` can read check runs and update PR comments/labels.
6. Agree on the named approval and audit mechanism for any bypass before
   testing that path. The template's existing local bypass scripts record an
   actor, timestamp, and reason but do not independently validate an external
   approver; do not claim the named-approval criterion is satisfied by them.

## Sign-off

| Reviewer | Role                                | Result | Date |
| -------- | ----------------------------------- | ------ | ---- |
|          | Independent first-time setup tester |        |      |
|          | Repository administrator            |        |      |
|          | Security/review owner               |        |      |
