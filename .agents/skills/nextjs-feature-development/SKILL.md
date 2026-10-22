---
name: nextjs-feature-development
description: "Use when implementing or changing a feature in this Next.js App Router, React, TypeScript, or Tailwind project."
---

# Next.js Feature Development

## Procedure

1. Read `AGENTS.md` and inspect the existing route, component, library, and test
   patterns relevant to the requested feature.
2. Before writing Next.js code, consult the relevant installed guide under
   `node_modules/next/dist/docs/` when available. Follow the version installed
   by this repository rather than relying on older Next.js conventions.
3. Keep server components as the default. Add client boundaries only where
   browser interaction or client state requires them.
4. Wrap every failable or external operation in `Result<T, E>` and return
   `Result` from each caller that can propagate its failure. Use
   `from_promise()`, `from_throwable()`, or `from_ullable()` at the boundary.
   If a dependency already returns a Result, propagate it without wrapping it
   a second time.
   Avoid handwritten `try/catch`; never swallow failures or use `unwrap()` /
   `expect()` on production paths. See `AGENTS.md` for complete guidance.
5. Validate external input before mutations, reuse existing components and
   utilities, and keep server-only logic out of client modules.
6. Follow `eslint.config.mts` for naming rather than a generic style guide;
   run ESLint when a naming case is uncertain.
7. Add or update focused tests for changed behavior. Cover failure paths and
   input boundaries as well as successful behavior.
8. Run the smallest relevant test and lint/type checks. Report exact commands
   and distinguish passed, failed, and unrun checks.

## Guardrails

- Keep changes within the requested feature; do not introduce a new library or
  architectural layer without a clear need.
- Do not copy secrets, user data, or credentials into source files or fixtures.
- Ask for clarification when product behavior or acceptance criteria are
  ambiguous.
