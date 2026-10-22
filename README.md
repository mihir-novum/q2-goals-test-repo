# Q2 Goals SDLC Demo

Disposable demo repository for validating the AI SDLC template goals. It is
based on the Next.js template and is not a production application.

Track evidence against the success criteria in
[docs/ACCEPTANCE-VALIDATION.md](./docs/ACCEPTANCE-VALIDATION.md). The
human-and-agent onboarding process is in [docs/SETUP.md](./docs/SETUP.md).

Do not commit production credentials. Use only synthetic canary values for
secret-scanning demonstrations.

For the end-to-end onboarding process—including GitHub rules, Actions
permissions and secrets, local development, MCP authorization, and AI-agent
workflows—see the **[Project Setup Guide](./docs/SETUP.md)**.

## Local Development

Use Node.js 22 and the pnpm version declared in `package.json`.

```bash
corepack enable
pnpm install
pnpm dev
```

For the containerized development environment, copy `.env.example` to `.env`,
set a unique local `POSTGRES_PASSWORD`, then open the folder in a Dev Container.
The container runs the app workspace and a disposable local Postgres database.
Do not use production credentials in `.env`. To run only the production Docker
image, use `docker build -t nextjs-template .` and
`docker run --rm -p 3000:3000 nextjs-template`.

Run `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm format:check` before
opening a pull request. `pnpm build` validates the production build. The
`./scripts/setup.sh` installs dependencies and local secret-scanning tooling,
then enables the committed Git hooks.

## Agent Skills

Shared, on-demand agent workflows live in `.agents/skills/`:

- `adapting-template` — prepare a clone for a real project and team.
- `nextjs-feature-development` — implement App Router features using this
  repository's conventions.
- `jira-ticket-implementation` — work from an authorized Jira issue.
- `pull-request-review` — perform an evidence-based code review.
- `quality-verification` — select and report project checks accurately.

Clients with Agent Skills support can discover these workflows automatically.
Otherwise, ask the agent to read the relevant `SKILL.md`. Skills provide
procedures; `AGENTS.md` remains the shared source for repository rules.

You develop as you normally would. However, Git commands are protected:

### Using Jira Tickets with Coding Agents

`.vscode/mcp.json` configures the GitHub, Context7 documentation, Jira, and
DBHub database MCP servers for VS Code agents. Start each server from VS Code's
MCP controls and complete the provider's authorization prompt when asked.
DBHub asks for a database DSN at connection time; use a local or otherwise
least-privilege read-only account for agent access. Never commit database URLs,
credentials, or access tokens.

Agents that support MCP and read `AGENTS.md` can use an authorized connection to
retrieve Jira issues. Include a Jira issue key or link in your request, for
example: `Implement PROJ-123`. Jira access is read-only unless you explicitly
request a Jira change. Other agent clients may require their own MCP setup and
authorization; workspace instructions alone do not grant them access.
The shared project context lives in `AGENTS.md`, specialized workflows in
`.agents/skills/`, Copilot-specific rules in `.github/copilot-instructions.md`,
and reusable task prompts in `.github/prompts/`.

### GitHub Pull Request Reviews

The CI workflow runs six separate required-check candidates: `Secret Scan`,
`Format`, `Lint`, `Type Check`, `Unit Tests`, and `Dependency Audit`. The
pre-commit and pre-push hooks run corresponding local checks and stop
immediately on failure. The dependency gate audits packages declared directly
in `package.json`; raw `pnpm audit` still reports the full dependency tree.

After adapting the template, authenticate GitHub CLI with repository
administration access and protect the actual default branch:

```bash
pnpm run configure:branch-protection -- main
```

The command creates or updates an active repository ruleset with no bypass
actors, prohibits direct branch updates/deletion/force-pushes, requires all six
checks and one approval, and enables repository auto-merge. Replace `main` with
the real protected branch. To require a valid CODEOWNERS approval as well:

```bash
pnpm run configure:branch-protection -- main --codeowners
```

Add real GitHub users or teams to `.github/CODEOWNERS` before enabling that
option. Rulesets and auto-merge are external repository settings; the command
requires repository-admin permissions and is intentionally not run during
installation.

`.github/pr-automation.yml` controls human-review conditions, AI summaries,
automated approval, and auto-merge. It is read from the trusted default branch.
With the template defaults, clean same-repository PRs are eligible for
automated approval and a squash auto-merge after all checks pass. Sensitive
files, configured labels, CODEOWNERS paths, failed or missing checks, stale CI
results, and incomplete PR metadata prevent automated approval and add a
`needs-human-review` label. A sticky PR comment reports the changed files and
verified check results; configured human-review cases also notify reviewers
through the label and comment. Fork PRs can receive the same summary and
label, but require human approval and are never auto-approved or auto-merged.

Configure these repository Actions secrets to activate the optional services:

- `PR_AUTOMATION_APP_ID` and `PR_AUTOMATION_APP_PRIVATE_KEY`: a GitHub App
  installed only on the target repository and granted **Contents: write** and
  **Pull requests: write**. The workflow mints a short-lived, permission-limited
  installation token only for eligible, same-repository approval and merge.
- `COPILOT_GITHUB_TOKEN`: a Copilot-enabled token used by the AI summary step.
  The PR diff is sent to GitHub Copilot. AI text is untrusted and separate from
  verified check results. Without the secret, the workflow posts the
  deterministic checks/files summary and reports that AI was skipped.

The `CI` workflow runs with read-only repository permissions and does not
receive these secrets. `PR Automation` runs only after CI completes, checks out
the trusted default branch, and reads PR metadata, check results, and the diff
through the GitHub API. It never checks out PR-head code or consumes artifacts
from the CI run. Bitbucket automation is not configured by this GitHub-based
template.

### 📥 On `git commit` (Pre-commit Hook)

Before a commit is created, Husky runs:

1. **Betterleaks Secret Scan:** Scans the _staged files_ for API keys, passwords, and Supabase JWTs/Database URLs.
2. **Format Check:** Ensures code matches Prettier rules.
3. **Linter:** Runs ESLint.

_If any secrets are found, the commit is aborted immediately, showing you the exact file and line number._

### 📤 On `git push` (Pre-push Hook)

Before code leaves your machine, Husky runs all CI quality gates: full secret
scan, format, lint, typecheck, unit tests, and direct dependency vulnerability
scan. This catches bypassed or missed pre-commit checks before pushing.

---

### Emergency Bypass Procedure

If a git hook fails, you must fix the issue. **Do not use `git commit --no-verify`.**

If an exceptional, documented bypass is necessary, use an audited bypass
script. A commit bypass logs the reason in that commit. A push bypass first
creates and pushes a separate audit-log commit:

For a commit:

```bash
./scripts/bypass-commit.sh -m "feat: your commit message"
```

For a push:

```bash
./scripts/bypass-push.sh
```

Both scripts require a non-empty reason and record the actor, UTC time, and
reason in `.bypass-audit.log`. A local bypass never bypasses GitHub required
checks or branch rules; do not use `--no-verify` directly.
