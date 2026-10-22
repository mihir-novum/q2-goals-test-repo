# Q2 Goals Demo: Acceptance Validation

This repository is a disposable public demo for validating the AI SDLC goals.
It contains no production credentials. Never use a real secret as a test
fixture; use a synthetic canary only.

## Current evidence

| Goal                                                         | Acceptance evidence                                                                                                                                                               | Status                                                  |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Fresh clone and runnable project in under 30 minutes         | Clean-clone setup, install, checks, production build, and dev-server HTTP smoke test completed by the current operator. Independent first-time tester timing is still required.   | Operator-validated; independent validation pending      |
| At least two MCP integrations working and documented         | GitHub MCP listed both workflows in this repository; Atlassian MCP returned the authorized Jira site. Setup is documented in `docs/SETUP.md`.                                     | Verified for current operator                           |
| Push and PR enforcement                                      | Active `main` ruleset requires six exact checks and has no bypass actors. Direct push to `main` was rejected by GitHub after local pre-push checks passed.                        | Direct push verified; failing-PR test matrix pending    |
| 8–10 deliberately failing changes including a planted secret | Use a synthetic canary only; retain PR/check-run URLs and confirm there is no approval/merge.                                                                                     | Not run                                                 |
| Named, logged bypass                                         | Protected GitHub Environment selected as the approval mechanism. A reviewer other than the workflow requester must be configured; no independent reviewer is currently available. | Blocked pending independent approver and implementation |
| 15+ passing PRs auto-approved without human action           | After configuring an isolated GitHub App and secrets, record PR, head SHA, all gate results, App review, and merge eligibility for each trial.                                    | Blocked: GitHub App secrets not configured              |
| Failing PRs are never auto-approved                          | For every failing trial, capture failed check and absence of approval; include stale-head, draft, fork, and sensitive-path cases.                                                 | Not run                                                 |
| Human-review stage toggles per repository                    | Test policy enabled and disabled in separate controlled runs. A change to trusted policy takes effect after it is on the default branch.                                          | Not run                                                 |

## Recorded baseline

- Demo repository: <https://github.com/mihir-novum/q2-goals-test-repo>
- Baseline commit: <https://github.com/mihir-novum/q2-goals-test-repo/commit/a2c0daa>
- Initial CI run: <https://github.com/mihir-novum/q2-goals-test-repo/actions/runs/39794667505>
- Evidence update PR: <https://github.com/mihir-novum/q2-goals-test-repo/pull/1>
- Branch rules: <https://github.com/mihir-novum/q2-goals-test-repo/rules?ref=refs/heads/main>
- The active `main` ruleset requires `Secret Scan`, `Format`, `Lint`, `Type Check`,
  `Unit Tests`, and `Dependency Audit`, requires one PR approval, prohibits
  direct updates/deletion/force-pushes, and has an empty bypass-actor list.
- A direct push attempt to `main` was rejected with `GH013` ("Changes must be
  made through a pull request"; six required status checks expected). Local
  pre-push checks passed before GitHub rejected the update.
- The baseline CI run completed with all six jobs successful. PR #1 is open;
  its change to `scripts/**` is intentionally covered by the human-review
  policy and the branch ruleset's required approval.
- On the first dependency download, `pnpm install --frozen-lockfile` took
  33.4 seconds. A separate clean clone with the local pnpm store warm completed
  install in 1.7 seconds and `scripts/setup.sh` installed Betterleaks. The
  complete first-time human path has not yet been timed by an independent
  tester, so do not report the under-30-minute criterion as independently
  proven.
- The local baseline passed formatting, lint, typecheck, all 18 unit tests,
  secret scan, direct dependency audit, and production build. A clean clone
  started the Next.js dev server and returned the expected page over HTTP.
- Betterleaks detected a synthetic, nonfunctional GitHub-token-shaped canary
  in a temporary local fixture. The fixture was removed immediately; no canary
  was committed or pushed.
- All six jobs in the initial GitHub CI run completed successfully.
- The initial dependency download took 33.4 seconds. The separate clean clone's
  install used a warm local package store; the end-to-end flow took a few
  minutes in this environment. This is not a cold-cache benchmark or an
  independent first-time user's validation.
- No GitHub Actions secrets are configured in this demo repository. In
  particular, `PR_AUTOMATION_APP_ID` and
  `PR_AUTOMATION_APP_PRIVATE_KEY` are absent, so automated approval and the
  15-PR passing trial cannot be validated yet.

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
6. Configure a protected `bypass-approval` GitHub Environment with at least
   one named reviewer other than the workflow requester, and enable
   self-review prevention. The demo owner is currently the only available
   reviewer, so the named-approval criterion is blocked. The template's local
   bypass scripts record an actor, timestamp, and reason but do not
   independently validate an external approver; do not claim that they satisfy
   this criterion.

## Sign-off

| Reviewer | Role                                | Result | Date |
| -------- | ----------------------------------- | ------ | ---- |
|          | Independent first-time setup tester |        |      |
|          | Repository administrator            |        |      |
|          | Security/review owner               |        |      |
