---
name: quality-verification
description: "Use when validating a code change, preparing a branch for review, troubleshooting CI, or checking whether this project is ready to build and test."
---

# Quality Verification

## Procedure

1. Inspect `package.json`, CI workflows, and nearby tests to determine the
   repository's actual commands; do not assume a command exists.
2. Run the smallest relevant test first. For a broader change, use the
   available checks:
   - `pnpm test`
   - `pnpm typecheck`
   - `pnpm lint`
   - `pnpm format:check`
   - `pnpm build` when the change could affect production compilation.
3. For security-sensitive changes, inspect the configured secret and
   dependency scanning commands and run them when the required tools are
   available.
4. Review the final diff for accidental files, generated artifacts, secrets,
   debug output, and whitespace errors.
5. Report exact commands and outcomes. Explain environment blockers and list
   unrun checks; never substitute a successful proxy check for the requested
   verification.

## Guardrails

- Do not install packages or alter dependency manifests just to bypass a
  missing local tool without user approval or a clear repository requirement.
- Do not skip a failing check or disable a quality gate to make validation pass.
