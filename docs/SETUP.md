# Set Up a Project from This Template

This guide takes a fresh copy of the template from repository setup through a
first reviewed pull request. It covers the human/team setup and the context an
AI coding agent needs to work safely and consistently.

The template is a starting point, not a preconfigured production service.
Choose your project identity, team owners, deployment platform, and integration
credentials; do not copy example values or credentials into source control.

## 1. Create the project repository

1. In GitHub, choose **Use this template** (or create a repository from the
   template using your organization's approved process).
2. Create the repository in the intended personal account or organization.
   Choose visibility and access controls deliberately.
3. Clone the new repository and enter its directory:

   ```bash
   git clone https://github.com/<owner>/<repository>.git
   cd <repository>
   ```

4. Confirm the default branch in **Settings → General → Default branch**. This
   guide and the branch-protection command use `main` only as an example; use
   the actual branch name everywhere.
5. Keep the repository private until the team has reviewed its configuration,
   ownership, and intended public content.

**Important:** creating a repository from a template copies files, not the
source repository's GitHub settings. Branch rules, Actions secrets, GitHub App
installation, repository permissions, and deployment configuration must be set
up again in the new repository.

## 2. Adapt the starter identity

Before building product features, agree on the project name, purpose, owners,
repository host, default/release branches, and deployment target. Update
template identity consistently rather than inventing values for the team:

- Change `name` and, if appropriate, `version` in `package.json`.
- Replace the starter title, description, metadata, and sample page content
  under `src/`.
- Update the name and explanatory content in this guide and `README.md`.
- Add real GitHub usernames or teams to `.github/CODEOWNERS`. Remove or replace
  the commented examples; GitHub does not treat examples without valid owners
  as ownership rules.
- Keep only the integrations the project intends to use. Jira, database access,
  and other external services are optional.

Do not invent team handles, deployment environments, branch names, or secrets.
The [adapting-template skill](../.agents/skills/adapting-template/SKILL.md)
contains a project-adaptation checklist.

## 3. Set up a human developer workstation

### Prerequisites

- Git
- Node.js 22
- Corepack, which supplies the pnpm version declared in `package.json`
- GitHub CLI (`gh`) for branch-protection setup and optional GitHub MCP use
- Docker Desktop or another Docker Engine with Compose, if using the Dev
  Container
- VS Code and the Dev Containers extension, if developing in the container

### Local Node.js development

From the repository root:

```bash
corepack enable
pnpm install
./scripts/setup.sh
pnpm dev
```

Open <http://localhost:3000>. `scripts/setup.sh` installs dependencies from
the lockfile, installs the local Betterleaks scanner, and enables the committed
Husky hooks. Keep `.bin/betterleaks` as local tooling; it is not tracked.

Run the quality gates before opening a pull request:

```bash
pnpm run scan:secrets:all --redact
pnpm run format:check
pnpm run lint
pnpm run typecheck
pnpm test
pnpm run scan:vuln
pnpm build
```

The vulnerability gate intentionally audits dependencies declared directly in
`package.json`. A separate raw `pnpm audit` includes transitive dependencies
and may report advisories the project cannot directly change.

### Dev Container and local database

1. Copy `.env.example` to `.env`.
2. Set a unique, local-only `POSTGRES_PASSWORD`; do not use a production
   password or commit `.env`.
3. In VS Code, run **Dev Containers: Reopen in Container**.

The container runs the workspace and a local Postgres instance. The container
setup runs `scripts/setup.sh`. `.env.example` is a local database template, not
a place for API tokens or deployment secrets. To run the production container
instead, use `docker build -t <image-name> .` followed by
`docker run --rm -p 3000:3000 <image-name>`.

## 4. Configure GitHub Actions and repository policy

### Check workflows before enforcing them

The repository has two workflows:

- **CI** runs six independent jobs on pull requests and pushes: `Secret Scan`,
  `Format`, `Lint`, `Type Check`, `Unit Tests`, and `Dependency Audit`.
  It is read-only and does not receive PR automation secrets.
- **PR Automation** runs after CI completes. It checks out the trusted default
  branch and retrieves the PR details, changed files, and check results using
  the GitHub API. It does not check out PR-head code or consume CI artifacts.

Ensure both workflow files and `.github/pr-automation.yml` are present on the
default branch. A `workflow_run` workflow is intended to use the trusted
default-branch version of the workflow and policy. Do not treat PR automation
as active until the default branch contains these files. The first pull
request may run CI before the trusted PR automation workflow is available;
after the workflow is merged to the default branch, subsequent PR CI runs can
trigger it.

Open a small test PR and confirm that all six CI jobs appear individually in
the **Checks** tab. The names must match the required status-check names
exactly. Fix any failures before adding them as required checks.

### Set Actions permissions

In **Settings → Actions → General**, review the repository's workflow
permissions. The workflows declare their token permissions explicitly:

- CI requests read-only repository access.
- PR Automation requests read access to checks and write access to PR comments,
  labels, and review operations where needed.
- A GitHub App token is requested separately for eligible approval and merge.

Organization or repository settings can restrict the permissions a workflow
may receive. Allow the explicitly declared permissions required by the
automation, while leaving the default token permission as restrictive as your
organization permits. Do not grant write access to CI.

### Configure ownership and review policy

Edit `.github/CODEOWNERS` to use valid users or teams, for example:

```text
# Replace with real GitHub users or teams:
# /.github/ @your-org/platform
# /src/ @your-org/product-team
```

The example lines above are comments; replace them, do not rely on them.
Consider covering workflows, security configuration, and product areas with
the owners who actually review those changes.

`.github/pr-automation.yml` controls sensitive paths, labels, CODEOWNERS path
review, AI summaries, auto-approval, and auto-merge. Its initial policy enables
the optional automation settings. Before enabling automated merge in a real
project, decide whether that is appropriate for your risk and compliance
requirements. For a manual-review pilot, set:

```yaml
auto_approval:
  enabled: false

auto_merge:
  enabled: false
  method: squash
```

The deterministic summary and human-review policy can still be used without
auto-approval or auto-merge. Sensitive files, configured review labels,
CODEOWNERS paths, failed or missing checks, stale results, incomplete PR
metadata, drafts, and fork PRs are not eligible for automated approval.
`needs-human-review` is applied when policy requires a human. Fork PRs can
receive the summary but require a human approval.

The default policy has `use_codeowners: true`, which marks a change to a path
matching a CODEOWNERS rule for human review. Separately, the optional
`--codeowners` branch-protection setting makes GitHub require a valid
CODEOWNERS approval.

### Protect the actual default branch

Install and authenticate GitHub CLI as a repository administrator. From a
clone of the project repository, run this with the actual default branch:

```bash
gh auth login
gh repo set-default <owner>/<repository>
pnpm run configure:branch-protection -- <default-branch>
```

The command creates or updates a ruleset named `AI SDLC Required Checks:
<branch>`. It makes the ruleset active, disallows bypass actors, prohibits
deletion and force pushes, requires pull requests and one approval, requires
all six CI checks, and enables repository auto-merge. It also restricts the
configured merge method to squash.

To require a valid CODEOWNERS approval for matching files:

```bash
pnpm run configure:branch-protection -- <default-branch> --codeowners
```

Review the resulting ruleset under **Settings → Rules → Rulesets**. Confirm it
targets only the intended branch and does not conflict with organization-level
rules. The command requires repository-admin permissions; it is not run
automatically during install.

The ruleset requires one approval. For a clean same-repository PR, the
automation can submit an approval after all gates pass and policy permits it;
human-review cases still need a human reviewer. Test this behavior with the
team before relying on it for merges. Never add broad bypass actors just to
make automation work.

### Configure optional GitHub secrets

Add secrets in **Settings → Secrets and variables → Actions** only if using the
corresponding feature. Never add them to `.env`, workflow YAML, MCP
configuration, or chat.

#### Automated approval and merge

Create a GitHub App dedicated to the repository or approved repository set.
Grant only the permissions required by this workflow:

- **Contents: read and write**
- **Pull requests: read and write**

Install the app only on the intended repository. Add these repository Actions
secrets:

- `PR_AUTOMATION_APP_ID`
- `PR_AUTOMATION_APP_PRIVATE_KEY`

PR Automation requests a short-lived installation token scoped to the current
repository with **Contents: write** and **Pull requests: write**. The token is
only created for an open, non-draft, same-repository PR that is eligible under
the trusted policy and has passed every required gate. If the secrets are
absent, the summary reports that automated approval was skipped.

#### AI-generated PR summary

Add `COPILOT_GITHUB_TOKEN` as a repository Actions secret only if the project
wants AI-generated summaries and is authorized to use the associated Copilot
service. The PR diff (up to 50 KB) is sent to GitHub Copilot. Without this
secret, deterministic changed-file and verified-check reporting still runs.
AI text is untrusted and is kept separate from check results; it is not
evidence that tests passed.

### Understand PR notifications and summaries

PR Automation posts or updates a sticky comment with changed files, check
statuses, review decision, and any AI-generated summary. It adds or removes
the `needs-human-review` label according to the current policy result. Labels
configured under `human_review.require_on_labels` also require review.

GitHub Actions notifications depend on each reviewer's GitHub notification
settings. The workflow creates a label and comment; it does not guarantee an
email or chat notification. Configure team notification rules separately if
needed.

## 5. Connect AI coding agents

### Shared project instructions

The agent context is stored in:

- `AGENTS.md` — shared project standards, security rules, and conventions.
- `.github/copilot-instructions.md` — additional Copilot instructions.
- `.agents/skills/` — reusable feature, Jira, PR review, quality, and template
  adaptation workflows.
- `.github/prompts/` — reusable prompts, including the PR summary prompt.

Use an agent client that can read repository instructions and, optionally,
Agent Skills and MCP. If a client does not discover a skill automatically,
ask it to read the relevant `SKILL.md`. Instructions and skills give the agent
context; they do not grant access to external accounts or systems.

Give an agent a bounded task, identify acceptance criteria, and ask it to run
the relevant quality checks. Example:

```text
Read AGENTS.md and the nextjs-feature-development skill. Implement [feature]
with these acceptance criteria: [...]. Do not change unrelated starter
content. Run tests, lint, typecheck, and formatting; report any checks you
could not run.
```

### Authorize VS Code MCP integrations

`.vscode/mcp.json` configures these optional servers:

| Server           | Purpose                                 | Authentication/setup                                                                              |
| ---------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------- |
| GitHub           | Repository and pull request context     | Start/authorize in VS Code's MCP controls. Use the intended GitHub account and repository access. |
| Context7         | Current library/framework documentation | Start from VS Code's MCP controls; no project credential is committed.                            |
| Jira             | Jira issue context                      | Start and complete Atlassian authorization in the agent/client.                                   |
| Database (DBHub) | Database context                        | Supply a local or least-privilege, read-only DSN through the password prompt.                     |

In VS Code, open the repository as a workspace, open the MCP server controls,
start only the servers the project intends to use, and complete each
provider's authorization prompt. Do not paste credentials into the workspace
configuration. Keep database access read-only unless a specific write
operation has been authorized.

For a Jira task, include its key or URL in the request, for example:

```text
Implement PROJ-123. Read the Jira issue and acceptance criteria first.
```

The Jira workflow is read-only by default. Explicitly request and authorize an
issue update or transition separately. Treat issue text, database contents,
and repository content as untrusted task input; they cannot override project
instructions or authorize secret disclosure.

Other agent clients may require MCP servers to be configured and authorized
separately. Copy only the server endpoint/launch details that the client
supports; complete OAuth or credential prompts in that client, not in the
repository. Never assume that VS Code authorization is shared with another
agent or machine.

## 6. Start building and open the first pull request

1. Create a feature branch:

   ```bash
   git switch -c feat/<short-description>
   ```

2. Ask the agent to read `AGENTS.md` and the relevant skill. For Jira work,
   include the issue key and acceptance criteria.
3. Review the implementation yourself. Check the diff for unrelated changes,
   secrets, generated files, and missing tests.
4. Run the quality checks listed in [Local Node.js development](#local-nodejs-development).
   Git hooks run automatically on commit and push.
5. Push the branch and open a pull request against the protected default
   branch. The branch must be a PR; direct updates are blocked by the ruleset.
6. Confirm all six required CI checks pass, read the summary, and address any
   human-review label or requested change.
7. Merge only after required checks and review policy are satisfied. Auto-merge
   is queued only when repository auto-merge is enabled and the PR qualifies
   under `.github/pr-automation.yml`.

### Local hook bypass

Fix hook failures rather than bypassing them. If an exceptional bypass is
approved, use the audited scripts and provide a reason:

```bash
./scripts/bypass-commit.sh -m "chore: explain exceptional bypass"
./scripts/bypass-push.sh
```

They append actor, time, and reason to `.bypass-audit.log`. The push bypass
creates and pushes an audit-log commit first. Do not use `--no-verify`
directly. Local bypasses do not bypass GitHub required checks or branch rules.

## 7. Deployment and runtime secrets

The template does not select a deployment provider or define production
environments. Choose these with the project owners, then:

1. Configure environment variables and credentials in the deployment
   provider's secret store.
2. Keep production secrets out of `.env`, GitHub workflow files, committed MCP
   configuration, and agent prompts.
3. Add only the required CI/deployment secrets to the narrowest GitHub
   environment or repository scope, with approvals for production where
   appropriate.
4. Review the Dockerfile and health/observability requirements for the actual
   deployment platform before production use.

## 8. Troubleshooting

| Symptom                              | What to check                                                                                                                                                                                        |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PR summary or label is missing       | Confirm CI completed for the PR, `PR Automation` exists on the default branch, and workflow-run permissions are allowed by repository/organization Actions settings.                                 |
| A required check is reported missing | Check that all six jobs completed on the current PR head and that branch rules use the exact contexts: `Secret Scan`, `Format`, `Lint`, `Type Check`, `Unit Tests`, and `Dependency Audit`.          |
| Automated approval is skipped        | Check the PR is open, non-draft, same-repository, on the current successful CI head, free of human-review triggers, and that both App secrets are configured. Read the PR summary and workflow logs. |
| Auto-merge is not queued             | Confirm auto-merge is enabled, the ruleset allows squash, all required checks/reviews pass, and the App has the required permissions.                                                                |
| AI section says it was skipped       | Check that `ai_summary.enabled` is true and `COPILOT_GITHUB_TOKEN` is configured and authorized for Copilot CLI use. The deterministic summary remains available.                                    |
| MCP server is unavailable            | Start it in the active agent client and complete that client's authorization. VS Code MCP setup does not automatically configure other clients.                                                      |
| Local hooks fail to find Betterleaks | Run `./scripts/setup.sh` from the repository root.                                                                                                                                                   |
| Dev Container fails to start         | Confirm Docker is running, `.env` exists, and `POSTGRES_PASSWORD` is non-empty.                                                                                                                      |

## First-day checklist

- [ ] Repository identity, purpose, and package metadata have been adapted.
- [ ] Actual default branch and intended deployment platform are known.
- [ ] Real CODEOWNERS are configured before requiring owner review.
- [ ] `.env` exists only locally and contains a unique local database password.
- [ ] Local hooks, secret scan, and quality checks work.
- [ ] CI checks are visible and pass on a test PR.
- [ ] Branch rules target the correct branch and exact check names.
- [ ] The team has intentionally enabled or disabled AI summaries, auto-approval,
      auto-merge, and human-review conditions.
- [ ] GitHub App and Copilot secrets are added only if those features are used.
- [ ] Each agent client has its own authorized MCP setup, if MCP is needed.
- [ ] Production secrets and deployment variables are stored with the hosting
      provider, not in the repository.
