---
name: pull-request-review
description: "Use when reviewing a pull request or code diff for bugs, regressions, security issues, missing tests, or readiness for human review."
---

# Pull Request Review

## Procedure

1. Establish the exact base and head of the requested review. Inspect the
   complete diff and relevant surrounding code; do not infer correctness from
   a summary or changed-file list alone.
2. Trace changed behavior through its callers and tests. Check input validation,
   authorization, error handling, asynchronous work, and compatibility with
   the project's Next.js version.
3. Report only actionable findings. For each, include severity, file and line,
   the concrete impact, and a practical fix. Do not report style preferences as
   bugs.
4. Separate confirmed findings from questions or risks that need more context.
   If there are no findings, say so and note important gaps in test coverage.
5. Report actual test/check status. Never describe checks as passing unless
   they were run or their CI result was inspected.
6. Flag cases requiring human judgment, including secrets exposure, security
   boundary changes, migrations, destructive behavior, or unclear acceptance
   criteria.

## Guardrails

- Do not modify files during a review unless the user separately asks for fixes.
- Do not approve, merge, or modify the pull request unless explicitly
  authorized.
- Do not treat AI findings as a replacement for CI, security scanning, or
  required human approval.
