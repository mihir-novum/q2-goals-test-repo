#!/usr/bin/env node

import fs from "node:fs";
import process from "node:process";

export function find_pr_numbers(pull_request_pages, expected_head_sha) {
  if (!Array.isArray(pull_request_pages) || !expected_head_sha) {
    throw new Error("Pull request pages and a head SHA are required.");
  }

  const pull_requests = pull_request_pages.flat();
  if (
    !pull_requests.every(
      (pull_request) =>
        pull_request &&
        typeof pull_request === "object" &&
        typeof pull_request.state === "string" &&
        Number.isInteger(pull_request.number) &&
        typeof pull_request.draft === "boolean" &&
        typeof pull_request.head?.sha === "string",
    )
  ) {
    throw new Error("GitHub returned invalid pull request metadata.");
  }

  return pull_requests
    .filter(
      (pull_request) =>
        pull_request.state === "open" &&
        !pull_request.draft &&
        pull_request.head.sha === expected_head_sha,
    )
    .map((pull_request) => pull_request.number);
}

const pull_request_pages = JSON.parse(
  fs.readFileSync(process.env.OPEN_PULL_REQUESTS_PATH, "utf8"),
);
const pr_numbers = find_pr_numbers(
  pull_request_pages,
  process.env.PR_EXPECTED_HEAD_SHA,
);
fs.appendFileSync(
  process.env.GITHUB_OUTPUT,
  `pr_numbers=${JSON.stringify(pr_numbers)}\n`,
);
