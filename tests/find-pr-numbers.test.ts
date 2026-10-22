/* eslint-disable @typescript-eslint/naming-convention */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

const SCRIPT_PATH = fileURLToPath(
  new URL("../scripts/find-pr-numbers.mjs", import.meta.url),
);

test("selects only open pull requests matching the completed CI head SHA", () => {
  const temporary_directory = mkdtempSync(join(tmpdir(), "find-pr-numbers-"));
  const pull_requests_path = join(temporary_directory, "pull-requests.json");
  const output_path = join(temporary_directory, "github-output.txt");

  try {
    writeFileSync(
      pull_requests_path,
      JSON.stringify([
        [
          {
            draft: false,
            number: 12,
            state: "open",
            head: { sha: "current-sha" },
          },
          {
            draft: false,
            number: 13,
            state: "open",
            head: { sha: "newer-sha" },
          },
          {
            draft: false,
            number: 14,
            state: "closed",
            head: { sha: "current-sha" },
          },
          {
            draft: true,
            number: 15,
            state: "open",
            head: { sha: "current-sha" },
          },
        ],
      ]),
    );
    writeFileSync(output_path, "");

    execFileSync(process.execPath, [SCRIPT_PATH], {
      env: {
        ...process.env,
        GITHUB_OUTPUT: output_path,
        OPEN_PULL_REQUESTS_PATH: pull_requests_path,
        PR_EXPECTED_HEAD_SHA: "current-sha",
      },
    });

    expect(readFileSync(output_path, "utf8")).toBe("pr_numbers=[12]\n");
  } finally {
    rmSync(temporary_directory, { recursive: true, force: true });
  }
});

test("fails when GitHub returns malformed pull request metadata", () => {
  const temporary_directory = mkdtempSync(join(tmpdir(), "find-pr-numbers-"));
  const pull_requests_path = join(temporary_directory, "pull-requests.json");

  try {
    writeFileSync(
      pull_requests_path,
      JSON.stringify([[{ number: "not-a-number" }]]),
    );

    expect(() =>
      execFileSync(process.execPath, [SCRIPT_PATH], {
        env: {
          ...process.env,
          GITHUB_OUTPUT: join(temporary_directory, "github-output.txt"),
          OPEN_PULL_REQUESTS_PATH: pull_requests_path,
          PR_EXPECTED_HEAD_SHA: "current-sha",
        },
        stdio: "pipe",
      }),
    ).toThrow();
  } finally {
    rmSync(temporary_directory, { recursive: true, force: true });
  }
});
