/* eslint-disable @typescript-eslint/naming-convention */
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

const ENGINE_PATH = fileURLToPath(
  new URL("../scripts/pr-review-engine.mjs", import.meta.url),
);
const PASSED_GATES = {
  GATE_SECRETS: "success",
  GATE_FORMAT: "success",
  GATE_LINT: "success",
  GATE_TYPES: "success",
  GATE_TESTS: "success",
  GATE_VULN: "success",
};

function run_engine(
  changed_files: string[],
  gate_statuses: Record<string, string>,
  expected_human_review: boolean,
  expected_file_count = changed_files.length,
  policy_text = "",
  expected_head_sha?: string,
  pr_head_sha?: string,
  pr_is_fork = false,
  pr_is_draft = false,
): { summary: string; output: string } {
  const temporary_directory = mkdtempSync(join(tmpdir(), "pr-review-engine-"));
  const changed_files_path = join(temporary_directory, "changed-files.json");
  const pr_details_path = join(temporary_directory, "pr-details.json");
  const output_path = join(temporary_directory, "github-output.txt");

  try {
    if (policy_text) {
      const github_directory = join(temporary_directory, ".github");
      mkdirSync(github_directory);
      writeFileSync(join(github_directory, "pr-automation.yml"), policy_text);
    }
    writeFileSync(changed_files_path, JSON.stringify(changed_files));
    if (pr_head_sha) {
      writeFileSync(
        pr_details_path,
        JSON.stringify({
          additions: 0,
          base: { repo: { full_name: "example/project" } },
          changed_files: expected_file_count,
          deletions: 0,
          draft: pr_is_draft,
          head: {
            repo: {
              full_name: pr_is_fork ? "contributor/project" : "example/project",
            },
            sha: pr_head_sha,
          },
          labels: [],
          state: "open",
          title: "Example feature",
        }),
      );
    }
    writeFileSync(output_path, "");
    execFileSync(process.execPath, [ENGINE_PATH], {
      cwd: temporary_directory,
      env: {
        ...process.env,
        ...gate_statuses,
        GITHUB_OUTPUT: output_path,
        PR_CHANGED_FILE_COUNT: String(expected_file_count),
        PR_CHANGED_FILES_PATH: changed_files_path,
        PR_DIFF_STAT: `${changed_files.length} files changed`,
        PR_DETAILS_PATH: pr_head_sha ? pr_details_path : "",
        ...(expected_head_sha
          ? { PR_EXPECTED_HEAD_SHA: expected_head_sha }
          : {}),
        PR_TITLE: "Example feature",
      },
      stdio: "pipe",
    });

    const summary = readFileSync(
      join(temporary_directory, ".pr-summary.md"),
      "utf8",
    );
    const output = readFileSync(output_path, "utf8");
    expect(output).toContain(`needs_human_review=${expected_human_review}`);
    return { summary, output };
  } finally {
    rmSync(temporary_directory, { recursive: true, force: true });
  }
}

test("summarizes passing checks and ordinary changed files", () => {
  const { summary } = run_engine(
    ["src/app/page.tsx", "tests/example.test.ts"],
    { ...PASSED_GATES },
    false,
  );

  expect(summary).toContain("Automated Checks Passed");
  expect(summary).toContain("Vitest unit tests:** ✅ Pass");
  expect(summary).toContain("src/app/page.tsx");
  expect(summary).not.toContain("Human Review Required");
});

test("requires human review when checks did not run", () => {
  const { summary } = run_engine(
    ["src/app/page.tsx"],
    { ...PASSED_GATES, GATE_TESTS: "not_run" },
    true,
  );

  expect(summary).toContain("Human Review Required");
  expect(summary).toContain("Vitest unit tests:** ⏭️ Not run");
});

test("requires human review for sensitive files", () => {
  const { summary } = run_engine(["package.json"], { ...PASSED_GATES }, true);

  expect(summary).toContain("Human Review Required");
  expect(summary).toContain("package.json");
});

test("requires human review for quality-gate tooling changes", () => {
  const { summary } = run_engine(
    ["scripts/audit-direct-dependencies.mjs"],
    { ...PASSED_GATES },
    true,
  );

  expect(summary).toContain("Human Review Required");
  expect(summary).toContain("scripts/audit-direct-dependencies.mjs");
});

test("requires human review when the changed-file list is incomplete", () => {
  const { summary } = run_engine(
    ["src/app/page.tsx"],
    { ...PASSED_GATES },
    true,
    3001,
  );

  expect(summary).toContain("full changed-file list could not be verified");
  expect(summary).toContain("1 of 3001 files available");
});

test("blocks automation when CI ran against an older PR head", () => {
  const { output, summary } = run_engine(
    ["src/app/page.tsx"],
    { ...PASSED_GATES },
    true,
    1,
    "",
    "current-head",
    "older-head",
  );

  expect(output).toContain("auto_approval_eligible=false");
  expect(summary).toContain(
    "The PR head changed after this CI run; its check results cannot approve the current commit.",
  );
});

test("requires human approval for fork pull requests", () => {
  const { output, summary } = run_engine(
    ["src/app/page.tsx"],
    { ...PASSED_GATES },
    true,
    1,
    "",
    "current-head",
    "current-head",
    true,
  );

  expect(output).toContain("auto_approval_eligible=false");
  expect(summary).toContain(
    "Fork pull requests require a human approval; automated approval is limited to same-repository pull requests.",
  );
});

test("does not auto-approve draft pull requests", () => {
  const { output, summary } = run_engine(
    ["src/app/page.tsx"],
    { ...PASSED_GATES },
    false,
    1,
    "",
    "current-head",
    "current-head",
    false,
    true,
  );

  expect(output).toContain("auto_approval_eligible=false");
  expect(summary).toContain("Draft PRs are not auto-approved or merged.");
});

test("allows automated approval and merge only for clean PRs", () => {
  const { summary, output } = run_engine(
    ["src/app/page.tsx"],
    { ...PASSED_GATES },
    false,
    1,
    [
      "auto_approval:",
      "  enabled: true",
      "auto_merge:",
      "  enabled: true",
      "  method: squash",
      "ai_summary:",
      "  enabled: true",
      "  model: gpt-4.1",
      "human_review:",
      "  always_require: false",
      "  use_codeowners: false",
      "  sensitive_paths: []",
      "  require_on_labels: []",
    ].join("\n"),
  );

  expect(output).toContain("auto_approval_eligible=true");
  expect(output).toContain("auto_merge_enabled=true");
  expect(output).toContain("ai_summary_enabled=true");
  expect(summary).toContain("Automated approval");
});

test("blocks automated approval when human review is required", () => {
  const { output } = run_engine(
    ["src/app/page.tsx"],
    { ...PASSED_GATES, GATE_LINT: "failure" },
    true,
    1,
    [
      "auto_approval:",
      "  enabled: true",
      "auto_merge:",
      "  enabled: true",
      "ai_summary:",
      "  enabled: false",
      "human_review:",
      "  always_require: false",
      "  use_codeowners: false",
      "  sensitive_paths: []",
      "  require_on_labels: []",
    ].join("\n"),
  );

  expect(output).toContain("auto_approval_eligible=false");
});
