import { describe, expect, it } from "vitest";
import { create_ruleset } from "../scripts/configure-branch-protection.mjs";

describe("branch protection ruleset", () => {
  it("requires every quality gate and an approval without bypass actors", () => {
    const ruleset = create_ruleset("main");

    expect(ruleset.enforcement).toBe("active");
    expect(ruleset.bypass_actors).toEqual([]);
    expect(ruleset.conditions.ref_name.include).toEqual(["refs/heads/main"]);

    const status_checks = ruleset.rules.find(
      (rule) => rule.type === "required_status_checks",
    );
    expect(status_checks.parameters.required_status_checks).toEqual([
      { context: "Secret Scan" },
      { context: "Format" },
      { context: "Lint" },
      { context: "Type Check" },
      { context: "Unit Tests" },
      { context: "Dependency Audit" },
    ]);

    const pull_request_rule = ruleset.rules.find(
      (rule) => rule.type === "pull_request",
    );
    expect(pull_request_rule.parameters.required_approving_review_count).toBe(
      1,
    );
    expect(pull_request_rule.parameters.require_code_owner_review).toBe(false);
  });

  it("can require CODEOWNERS approval per protected branch", () => {
    const ruleset = create_ruleset("main", true);
    const pull_request_rule = ruleset.rules.find(
      (rule) => rule.type === "pull_request",
    );

    expect(pull_request_rule.parameters.require_code_owner_review).toBe(true);
  });
});
