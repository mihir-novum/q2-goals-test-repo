#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import process from "node:process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const REQUIRED_CHECKS = [
  "Secret Scan",
  "Format",
  "Lint",
  "Type Check",
  "Unit Tests",
  "Dependency Audit",
];
const RULESET_PREFIX = "AI SDLC Required Checks";

export function create_ruleset(branch, require_codeowner_reviews = false) {
  const safe_branch = branch.replaceAll(/[^a-zA-Z0-9._/-]/g, "-");

  return {
    name: `${RULESET_PREFIX}: ${safe_branch}`,
    target: "branch",
    enforcement: "active",
    bypass_actors: [],
    conditions: {
      ref_name: {
        include: [`refs/heads/${branch}`],
        exclude: [],
      },
    },
    rules: [
      { type: "deletion" },
      { type: "non_fast_forward" },
      {
        type: "update",
        parameters: { update_allows_fetch_and_merge: false },
      },
      {
        type: "pull_request",
        parameters: {
          allowed_merge_methods: ["squash"],
          dismiss_stale_reviews_on_push: true,
          require_code_owner_review: require_codeowner_reviews,
          require_last_push_approval: true,
          required_approving_review_count: 1,
          required_review_thread_resolution: true,
        },
      },
      {
        type: "required_status_checks",
        parameters: {
          do_not_enforce_on_create: false,
          strict_required_status_checks_policy: true,
          required_status_checks: REQUIRED_CHECKS.map((context) => ({
            context,
          })),
        },
      },
    ],
  };
}

function run_gh(args, input) {
  const result = spawnSync("gh", args, {
    encoding: "utf8",
    input,
  });
  if (result.error) {
    throw new Error(`Could not run gh: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `gh exited with ${result.status}`);
  }
  return result.stdout.trim();
}

function configure_branch_protection() {
  const args = process.argv.slice(2).filter((argument) => argument !== "--");
  const branch = args[0];
  if (
    !branch ||
    branch.startsWith("-") ||
    !/^[A-Za-z0-9._/-]+$/.test(branch) ||
    branch.includes("..") ||
    branch.includes("//")
  ) {
    throw new Error(
      "Usage: pnpm configure:branch-protection -- <branch> [--codeowners]",
    );
  }

  const require_codeowner_reviews = args.includes("--codeowners");
  const repository = run_gh([
    "repo",
    "view",
    "--json",
    "nameWithOwner",
    "--jq",
    ".nameWithOwner",
  ]);
  const ruleset = create_ruleset(branch, require_codeowner_reviews);
  const existing_ruleset_id = run_gh([
    "api",
    `repos/${repository}/rulesets`,
    "--paginate",
    "--jq",
    `.[] | select(.name == ${JSON.stringify(ruleset.name)}) | .id`,
  ])
    .split("\n")
    .find(Boolean);
  const method = existing_ruleset_id ? "PUT" : "POST";
  const endpoint = existing_ruleset_id
    ? `repos/${repository}/rulesets/${existing_ruleset_id}`
    : `repos/${repository}/rulesets`;

  run_gh(
    ["api", endpoint, "--method", method, "--input", "-"],
    JSON.stringify(ruleset),
  );
  run_gh(
    ["api", `repos/${repository}`, "--method", "PATCH", "--input", "-"],
    JSON.stringify({ allow_auto_merge: true }),
  );

  console.log(
    `Configured required checks and pull-request rules for ${repository}:${branch}.`,
  );
  if (require_codeowner_reviews) {
    console.log("CODEOWNERS reviews are required for matched paths.");
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    configure_branch_protection();
  } catch (error) {
    console.error(
      `Could not configure branch protection: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    process.exitCode = 1;
  }
}
