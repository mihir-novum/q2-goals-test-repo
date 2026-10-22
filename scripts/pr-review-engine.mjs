#!/usr/bin/env node

/**
 * PR Review & Automation Engine
 *
 * Evaluates PR risk, security gates, CODEOWNERS, and policy configuration.
 * Generates a sticky pull request summary and human-review status.
 *
 * Zero external npm dependencies (uses standard Node.js APIs).
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

// -----------------------------------------------------------------------------
// Helper: Simple Glob to RegExp Converter
// -----------------------------------------------------------------------------
function glob_to_regex(pattern) {
  // Normalize leading slashes
  const clean_pattern = pattern.replace(/^\//, "");
  let regex_str = "^";
  let i = 0;
  while (i < clean_pattern.length) {
    const c = clean_pattern[i];
    if (c === "*" && clean_pattern[i + 1] === "*") {
      if (clean_pattern[i + 2] === "/") {
        regex_str += "(?:.+/)?";
        i += 3;
      } else {
        regex_str += ".*";
        i += 2;
      }
    } else if (c === "*") {
      regex_str += "[^/]*";
      i += 1;
    } else if (c === "?") {
      regex_str += "[^/]";
      i += 1;
    } else if ("[\\^$.|+(){}".includes(c)) {
      regex_str += `\\${c}`;
      i += 1;
    } else {
      regex_str += c;
      i += 1;
    }
  }
  // Allow matching directory prefix if pattern ended with /
  if (clean_pattern.endsWith("/")) {
    regex_str += ".*$";
  } else {
    regex_str += "(?:/.*)?$";
  }
  return new RegExp(regex_str);
}

function matches_pattern(file_path, pattern) {
  const norm_path = file_path.replace(/^\//, "");
  return glob_to_regex(pattern).test(norm_path);
}

function escape_markdown(value) {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("`", "\\`")
    .replaceAll("*", "\\*")
    .replaceAll("_", "\\_")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replace(/[\r\n]/g, " ");
}

function escape_code_span(value) {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("`", "\\`")
    .replace(/[\r\n]/g, " ");
}

// -----------------------------------------------------------------------------
// Helper: Simple YAML Policy Parser (no external dependency)
// -----------------------------------------------------------------------------
function parse_policy_yaml(file_path) {
  const default_policy = {
    auto_approval: {
      enabled: false,
    },
    auto_merge: {
      enabled: false,
      method: "squash",
    },
    ai_summary: {
      enabled: false,
      model: "gpt-4.1",
    },
    human_review: {
      always_require: false,
      use_codeowners: true,
      sensitive_paths: [
        ".github/workflows/**",
        ".github/CODEOWNERS",
        ".github/pr-automation.yml",
        ".github/prompts/**",
        ".github/copilot-instructions.md",
        ".mcp.json",
        ".vscode/mcp.json",
        "AGENTS.md",
        "Dockerfile",
        "eslint.config.*",
        "vitest.config.*",
        "next.config.*",
        "package.json",
        "pnpm-workspace.yaml",
        "pnpm-lock.yaml",
        "tsconfig.json",
        ".betterleaks.toml",
        "scripts/**",
      ],
      require_on_labels: ["security", "do-not-merge", "wip"],
    },
  };

  if (!fs.existsSync(file_path)) {
    return default_policy;
  }

  const content = fs.readFileSync(file_path, "utf8");
  const lines = content.split("\n");
  let current_section = null;
  let current_list = null;

  const policy = structuredClone(default_policy);

  for (const raw_line of lines) {
    const line = raw_line.replace(/#.*$/, "").trimEnd();
    if (!line.trim()) {
      continue;
    }

    const section_match = line.match(/^([a-z_]+):\s*$/);
    if (section_match) {
      current_section = section_match[1];
      current_list = null;
      continue;
    }

    const list_match = line.match(/^\s*-\s*["']?([^"']+)["']?\s*$/);
    if (list_match && current_section && current_list) {
      if (Array.isArray(policy[current_section]?.[current_list])) {
        policy[current_section][current_list].push(list_match[1].trim());
      }
      continue;
    }

    const kv_match = line.match(/^\s+([a-z_]+):\s*(.*)$/);
    if (kv_match && current_section) {
      const key = kv_match[1];
      const val = kv_match[2].trim();
      if (!Object.hasOwn(policy, current_section)) {
        throw new Error(`Unknown PR automation section: ${current_section}`);
      }

      if (val === "" || val === "[]") {
        current_list = key;
        if (Object.hasOwn(policy[current_section], key)) {
          policy[current_section][key] = [];
        } else {
          throw new Error(
            `Unknown PR automation setting: ${current_section}.${key}`,
          );
        }
      } else {
        current_list = null;
        let parsed_val = val.replace(/^["']|["']$/g, "");
        if (val === "true") {
          parsed_val = true;
        } else if (val === "false") {
          parsed_val = false;
        }
        if (!Object.hasOwn(policy[current_section], key)) {
          throw new Error(
            `Unknown PR automation setting: ${current_section}.${key}`,
          );
        }
        policy[current_section][key] = parsed_val;
      }
    }
  }

  for (const [section, key] of [
    ["auto_approval", "enabled"],
    ["auto_merge", "enabled"],
    ["ai_summary", "enabled"],
    ["human_review", "always_require"],
    ["human_review", "use_codeowners"],
  ]) {
    if (typeof policy[section][key] !== "boolean") {
      throw new Error(
        `PR automation setting ${section}.${key} must be true or false.`,
      );
    }
  }
  if (!["merge", "squash", "rebase"].includes(policy.auto_merge.method)) {
    throw new Error("PR automation setting auto_merge.method is invalid.");
  }
  if (!/^[A-Za-z0-9._-]+$/.test(policy.ai_summary.model)) {
    throw new Error("PR automation setting ai_summary.model is invalid.");
  }

  return policy;
}

// -----------------------------------------------------------------------------
// Helper: Parse CODEOWNERS
// -----------------------------------------------------------------------------
function parse_codeowners(file_path) {
  if (!fs.existsSync(file_path)) {
    return [];
  }
  const rules = [];
  const content = fs.readFileSync(file_path, "utf8");
  for (const raw_line of content.split("\n")) {
    const line = raw_line.replace(/#.*$/, "").trim();
    if (!line) {
      continue;
    }
    const parts = line.split(/\s+/);
    if (parts.length >= 1) {
      const pattern = parts[0];
      const owners = parts.slice(1);
      rules.push({ pattern, owners });
    }
  }
  return rules;
}

// -----------------------------------------------------------------------------
// Main Execution
// -----------------------------------------------------------------------------
function run() {
  const root_dir = process.cwd();
  const config_file = path.join(root_dir, ".github/pr-automation.yml");
  const codeowners_file = path.join(root_dir, ".github/CODEOWNERS");

  const policy = parse_policy_yaml(config_file);
  const codeowners_rules = parse_codeowners(codeowners_file);

  // Environment inputs from GitHub Actions
  const pr_details_path = process.env.PR_DETAILS_PATH;
  const pr_details = pr_details_path
    ? JSON.parse(fs.readFileSync(pr_details_path, "utf8"))
    : null;
  if (
    pr_details &&
    (typeof pr_details.title !== "string" ||
      !Array.isArray(pr_details.labels) ||
      typeof pr_details.state !== "string" ||
      !Number.isInteger(pr_details.changed_files) ||
      typeof pr_details.head?.sha !== "string" ||
      typeof pr_details.draft !== "boolean")
  ) {
    throw new Error("GitHub returned invalid pull request metadata.");
  }
  const pr_title = pr_details?.title || process.env.PR_TITLE || "Pull Request";
  const pr_labels = pr_details
    ? pr_details.labels.map((label) => label.name.toLowerCase())
    : (process.env.PR_LABELS || "")
        .split(",")
        .map((label) => label.trim().toLowerCase())
        .filter(Boolean);
  const expected_head_sha = process.env.PR_EXPECTED_HEAD_SHA;
  const stale_check_run =
    Boolean(expected_head_sha) && pr_details?.head.sha !== expected_head_sha;
  const pr_is_same_repository = pr_details
    ? Boolean(
        pr_details.head.repo?.full_name &&
        pr_details.base?.repo?.full_name &&
        pr_details.head.repo.full_name === pr_details.base.repo.full_name,
      )
    : process.env.PR_IS_SAME_REPOSITORY !== "false";
  const pr_is_draft = pr_details?.draft === true;
  const pr_is_open = pr_details ? pr_details.state === "open" : true;

  // Read changed-file metadata generated from the GitHub API.
  let changed_files = [];
  let diff_error = "";
  try {
    const changed_files_path =
      process.env.PR_CHANGED_FILES_PATH ||
      path.join(root_dir, ".pr-changed-files.json");
    const changed_files_json = JSON.parse(
      fs.readFileSync(changed_files_path, "utf8"),
    );
    if (
      !Array.isArray(changed_files_json) ||
      !changed_files_json.every((file) => typeof file === "string")
    ) {
      throw new Error("GitHub returned an invalid changed-files response.");
    }
    changed_files = changed_files_json;
  } catch (error) {
    diff_error =
      error instanceof Error
        ? error.message
        : "Unknown error while reading changed-file metadata.";
    console.error(`Unable to read pull request changed files: ${diff_error}`);
  }
  const diff_stat = pr_details
    ? `${pr_details.changed_files} files changed, +${pr_details.additions ?? 0}/-${pr_details.deletions ?? 0}`
    : process.env.PR_DIFF_STAT || "";
  const changed_file_count_value = pr_details
    ? String(pr_details.changed_files)
    : process.env.PR_CHANGED_FILE_COUNT || "";
  const changed_file_count = /^\d+$/.test(changed_file_count_value)
    ? Number(changed_file_count_value)
    : null;
  const changed_files_incomplete =
    changed_file_count === null || changed_file_count !== changed_files.length;

  // Gate statuses from environment
  const gate_secrets = process.env.GATE_SECRETS || "not_run";
  const gate_format = process.env.GATE_FORMAT || "not_run";
  const gate_lint = process.env.GATE_LINT || "not_run";
  const gate_types = process.env.GATE_TYPES || "not_run";
  const gate_tests = process.env.GATE_TESTS || "not_run";
  const gate_vuln = process.env.GATE_VULN || "not_run";

  const all_gates_passed =
    gate_secrets === "success" &&
    gate_format === "success" &&
    gate_lint === "success" &&
    gate_types === "success" &&
    gate_tests === "success" &&
    gate_vuln === "success";

  // Evaluate human review conditions
  const human_review_triggers = [];

  if (diff_error) {
    human_review_triggers.push(
      "The pull request diff could not be analyzed; inspect the changed files manually.",
    );
  }

  if (stale_check_run) {
    human_review_triggers.push(
      "The PR head changed after this CI run; its check results cannot approve the current commit.",
    );
  }

  if (!pr_is_same_repository) {
    human_review_triggers.push(
      "Fork pull requests require a human approval; automated approval is limited to same-repository pull requests.",
    );
  }

  if (changed_files_incomplete) {
    human_review_triggers.push(
      "The complete changed-file list could not be verified; review the full pull request manually.",
    );
  }

  if (!all_gates_passed) {
    human_review_triggers.push(
      "One or more automated quality gates failed or did not run; inspect the check results before merging.",
    );
  }

  if (policy.human_review.always_require) {
    human_review_triggers.push(
      "Repository policy enforces human review for all PRs.",
    );
  }

  // Check labels
  for (const req_label of policy.human_review.require_on_labels || []) {
    if (pr_labels.includes(req_label.toLowerCase())) {
      human_review_triggers.push(
        `PR is flagged with label: \`${escape_code_span(req_label)}\``,
      );
    }
  }

  // Check sensitive paths
  const matched_sensitive_files = [];
  for (const file of changed_files) {
    for (const sens_pattern of policy.human_review.sensitive_paths || []) {
      if (matches_pattern(file, sens_pattern)) {
        matched_sensitive_files.push(file);
        break;
      }
    }
  }
  if (matched_sensitive_files.length > 0) {
    const displayed_sensitive_files = matched_sensitive_files
      .slice(0, 3)
      .map(escape_code_span)
      .join("`, `");
    const additional_sensitive_files =
      matched_sensitive_files.length > 3 ? "..." : "";
    human_review_triggers.push(
      `Touches sensitive configuration or infrastructure (${matched_sensitive_files.length} file(s)): ` +
        `\`${displayed_sensitive_files}${additional_sensitive_files}\``,
    );
  }

  // Check CODEOWNERS
  if (policy.human_review.use_codeowners && codeowners_rules.length > 0) {
    const matched_codeowners = new Set();
    for (const file of changed_files) {
      for (const rule of codeowners_rules) {
        if (matches_pattern(file, rule.pattern)) {
          if (rule.owners && rule.owners.length > 0) {
            rule.owners.forEach((o) => matched_codeowners.add(o));
          } else {
            matched_codeowners.add(rule.pattern);
          }
        }
      }
    }
    if (matched_codeowners.size > 0) {
      human_review_triggers.push(
        `CODEOWNERS protection triggered for paths owned by: ${Array.from(matched_codeowners).join(", ")}`,
      );
    }
  }

  const needs_human_review = human_review_triggers.length > 0;
  const auto_approval_eligible =
    policy.auto_approval.enabled === true &&
    pr_is_open &&
    all_gates_passed &&
    !pr_is_draft &&
    !needs_human_review;
  // File Categorization
  const categories = {
    "UI Components": [],
    "App & Routing": [],
    "Core Libraries": [],
    "DevOps & Security": [],
    Configurations: [],
    Tests: [],
    Documentation: [],
    Other: [],
  };

  for (const file of changed_files) {
    if (file.startsWith("src/components/")) {
      categories["UI Components"].push(file);
    } else if (file.startsWith("src/app/")) {
      categories["App & Routing"].push(file);
    } else if (file.startsWith("src/lib/")) {
      categories["Core Libraries"].push(file);
    } else if (
      file.startsWith(".github/") ||
      file.startsWith("scripts/") ||
      file.startsWith(".husky/") ||
      file === "Dockerfile" ||
      file === "bitbucket-pipelines.yml"
    ) {
      categories["DevOps & Security"].push(file);
    } else if (
      file.includes(".test.") ||
      file.includes(".spec.") ||
      file.startsWith("tests/")
    ) {
      categories["Tests"].push(file);
    } else if (file.endsWith(".md")) {
      categories["Documentation"].push(file);
    } else if (
      file.endsWith(".json") ||
      file.endsWith(".yaml") ||
      file.endsWith(".yml") ||
      file.endsWith(".toml") ||
      file.includes("config.")
    ) {
      categories["Configurations"].push(file);
    } else {
      categories["Other"].push(file);
    }
  }

  // Format Badges
  const gate_status = (status) => {
    if (status === "success") {
      return "✅ Pass";
    }
    if (status === "failure") {
      return "❌ Fail";
    }
    if (status === "cancelled") {
      return "⚠️ Cancelled";
    }
    if (status === "skipped" || status === "not_run") {
      return "⏭️ Not run";
    }
    return "⚠️ Unknown";
  };

  // Construct Markdown Summary
  let summary = `<!-- pr-automation-summary -->
## 🤖 Pull Request Automation Summary

**${escape_markdown(pr_title)}**

`;

  if (!all_gates_passed) {
    summary += `> 🛑 **Human Review Required**: One or more automated quality gates failed or did not run. Review the check results before merging.\n\n`;
  } else if (needs_human_review) {
    summary += `> 🔍 **Human Review Required**: All CI gates passed, but this PR touches files or criteria that require human verification.\n\n`;
  } else {
    summary += `> ✅ **Automated Checks Passed**: All configured quality gates passed and no human-review policy was triggered.\n\n`;
  }

  // CI Gates Table
  summary += `### 🛡️ Quality & Security Gates
| Gate | Status | Description |
| :--- | :---: | :--- |
| **Secret Scan** | ${gate_status(gate_secrets)} | Scans repository content for API keys and tokens (Betterleaks) |
| **Code Style** | ${gate_status(gate_format)} | Prettier format verification |
| **Linter** | ${gate_status(gate_lint)} | ESLint rules and naming conventions |
| **Type Check** | ${gate_status(gate_types)} | TypeScript strict compilation without errors |
| **Unit Tests** | ${gate_status(gate_tests)} | Vitest test suite execution |
| **Vulnerabilities** | ${gate_status(gate_vuln)} | Dependency security audit (\`pnpm audit\`) |

`;

  summary += `### 🧪 Test Status
- **Vitest unit tests:** ${gate_status(gate_tests)}

`;

  // Review Decision Section
  summary += `### 📋 Review Assessment
- **PR Classification**: ${needs_human_review ? "⚠️ **High-Impact / Sensitive**" : "✨ **Clean / Low-Risk**"}
- **Automated approval**: ${policy.auto_approval.enabled ? "Enabled by policy; eligible only when all gates pass and human review is not required." : "Disabled by policy."}
- **Automatic merge**: ${policy.auto_merge.enabled ? `Enabled by policy (${escape_markdown(policy.auto_merge.method)}); requires repository auto-merge and branch protection.` : "Disabled by policy."}
- **AI summary**: ${policy.ai_summary.enabled ? `Enabled by policy (${escape_markdown(policy.ai_summary.model)}); requires the COPILOT_GITHUB_TOKEN secret.` : "Disabled by policy."}
- **Draft status**: ${pr_is_draft ? "Draft PRs are not auto-approved or merged." : "Ready for review."}
- **Human review required**: ${needs_human_review ? "Yes" : "No"}
`;

  if (human_review_triggers.length > 0) {
    summary += `- **Human Review Reasons**:\n`;
    for (const trigger of human_review_triggers) {
      summary += `  - ${trigger}\n`;
    }
  }

  // Changed Files Breakdown
  summary += `\n### 📁 Impact Breakdown (${changed_files.length} files)\n`;
  if (diff_error) {
    summary += `⚠️ Could not analyze the diff; review changed files manually.\n\n`;
  }
  if (changed_files_incomplete) {
    summary += `⚠️ The full changed-file list could not be verified (${changed_files.length} of ${changed_file_count ?? "an unknown number"} files available).\n\n`;
  }
  if (diff_stat) {
    summary += `*Summary: ${diff_stat}*\n\n`;
  }

  const max_files_in_summary = 100;
  let files_shown = 0;
  for (const [cat_name, files] of Object.entries(categories)) {
    if (files.length === 0 || files_shown >= max_files_in_summary) {
      continue;
    }
    const visible_files = files.slice(0, max_files_in_summary - files_shown);
    summary += `<details><summary><strong>${cat_name} (${files.length})</strong></summary>\n\n`;
    for (const file_path of visible_files) {
      summary += `- \`${escape_code_span(file_path)}\`\n`;
    }
    files_shown += visible_files.length;
    summary += `\n</details>\n`;
  }

  if (files_shown === 0) {
    summary += `_No changed files detected._\n`;
  } else if (changed_files.length > files_shown) {
    summary += `\n_${changed_files.length - files_shown} additional changed files omitted._\n`;
  }

  summary += `\n---\n*Automated review generated by \`pr-review-engine\` & GitHub Actions.*`;

  // Write human-review status for GitHub Actions.
  const github_output = process.env.GITHUB_OUTPUT;
  if (github_output) {
    fs.appendFileSync(
      github_output,
      [
        `needs_human_review=${needs_human_review}`,
        `auto_approval_eligible=${auto_approval_eligible}`,
        `auto_approval_enabled=${policy.auto_approval.enabled === true}`,
        `auto_merge_enabled=${policy.auto_merge.enabled === true}`,
        `ai_summary_enabled=${policy.ai_summary.enabled === true}`,
        `ai_summary_model=${policy.ai_summary.model}`,
        `pr_head_current=${!stale_check_run}`,
        `pr_is_same_repository=${pr_is_same_repository}`,
        `pr_is_draft=${pr_is_draft}`,
        `pr_is_open=${pr_is_open}`,
      ].join("\n") + "\n",
    );
  }

  // Write summary to file for posting
  const summary_path = path.join(root_dir, ".pr-summary.md");
  fs.writeFileSync(summary_path, summary, "utf8");
  console.log("PR Review Summary generated successfully at:", summary_path);
  console.log(
    `Decision: all_gates_passed=${all_gates_passed}, needs_human_review=${needs_human_review}`,
  );
}

run();
