---
name: adapting-template
description: "Use when turning this Next.js starter into a real project, cloning the template, replacing placeholders, or preparing a new repository for its team."
---

# Adapting This Template

## Procedure

1. Inspect the repository and identify starter content, placeholder values,
   enabled integrations, CI triggers, and security defaults before changing
   anything.
2. Ask for the project name, product purpose, repository host, default branch,
   team ownership, and deployment target when they are not supplied. Do not
   invent organization names, owners, environments, or secrets.
3. Update package metadata, README, application metadata, and example content
   consistently. Remove starter examples only when the replacement scope is
   clear.
4. Configure valid owners in `.github/CODEOWNERS`; GitHub ignores entries
   without valid users or teams. Verify that configured branch names match the
   team's actual default and release branches.
5. Review GitHub Actions and Bitbucket Pipelines independently. Keep pull
   request code untrusted, use least-privilege tokens, and do not assume that a
   GitHub-only feature is available in Bitbucket.
6. Configure deployment variables and credentials in the hosting provider's
   secret store. Never put credentials in the template, committed MCP config,
   workflow YAML, or chat.
7. Treat Jira MCP and other external integrations as optional. Keep only the
   integrations the project intends to use, and complete authorization in the
   agent/client rather than committing credentials.
8. Run the repository's quality checks and report any remaining setup choices
   or checks that could not be verified.

## Completion Checklist

- No unexplained starter branding or placeholder owners remain.
- Branch filters and repository policies match the destination repository.
- No secrets, credentials, or fake ownership rules were introduced.
- CI and documentation describe the same enabled features.
- Setup and validation commands work from a clean checkout.
