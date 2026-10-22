# GitHub Copilot Code Review Instructions

You are performing automated pull request reviews for this repository. Review all incoming changes against the strict project standards defined below. Keep feedback concise, actionable, and focused on potential bugs, security, and rule adherence.

---

## 1. Error Handling & Result Types

- **Check every failable/external call**: Calls that can fail, including
  external APIs, databases, filesystems, configuration, and third-party SDKs,
  must expose errors through `Result<T, E>` from `@lib/result`.
- **Check propagation**: Callers must return or chain the `Result` using
  `.and_then()`, `.map_err()`, or explicit error branches. Flag swallowed
  errors, success-shaped fallbacks, and production use of `.unwrap()` or
  `.expect()`.
- **Avoid handwritten `try/catch`**: Prefer `from_promise()`,
  `from_throwable()`, and `from_ullable()` at operation boundaries. Allow
  catches only when required by a framework/runtime boundary or cleanup, and
  verify that the error is converted and propagated.
- If a dependency already returns `Result`, propagate it directly; do not wrap
  it in another `Result`.

## 2. Naming Conventions (Strict)

Follow `eslint.config.mts` as the source of truth; do not apply a stricter
generic convention:

- Variables: `snake_case`, `PascalCase`, or `UPPER_CASE`; `use*` and `set*`
  variables/functions may also use `camelCase`; names ending in `Ref` use
  `camelCase`.
- Functions: `snake_case` or `PascalCase`.
- Parameters: `snake_case` or `camelCase`, with leading `_` allowed for
  intentionally unused parameters.
- Classes/type-like declarations: `PascalCase`; class members: `snake_case`;
  enum members: `UPPER_CASE`.
- Object-literal and type/interface properties: `snake_case` or `camelCase`;
  quoted keys and imports are unrestricted.
- Account for config-file/test overrides and framework-mandated names.
- Flag violations against the actual ESLint selectors, not personal preference.

## 3. TypeScript & Strict Typing

- **No `any`**: Flag any usage of the `any` type. Require explicit types or `unknown` with narrowing.
- **Explicit Return Types**: All functions must have an explicit return type annotation (e.g. `: Promise<Result<User, Error>>`, `: JSX.Element`).
- **Path Aliases**: Flag any relative parent imports like `../../lib/utils`. Require path aliases (`@app/*`, `@components/*`, `@lib/*`, `@hooks/*`, `@type/*`).
- **Type-Safe Routing**: Internal route strings passed to Next.js router or redirect should use `typed_route()` from `@lib/utils`.

## 4. Security & Hardening

- **Secrets & Credentials**: Immediately flag any hardcoded API keys, passwords, database URLs, or tokens.
- **Server Action Security**: Ensure all server action inputs are validated before database mutations.
- **No `console.log`**: Flag any `console.log` statements in production code. Only `console.warn` and `console.error` are allowed.

## 5. Testing & Verification

- New functions, utilities, and components should be accompanied by corresponding unit tests using Vitest in `tests/` or co-located test files.

## 6. Review Format

- Provide clear explanations for why a change violates project guidelines.
- Where appropriate, use GitHub suggestion blocks (` ```suggestion `) with correct drop-in replacement code.
