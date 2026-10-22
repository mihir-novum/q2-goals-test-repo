import { describe, expect, it } from "vitest";
import { filter_direct_advisories } from "../scripts/audit-direct-dependencies.mjs";

describe("direct dependency audit filtering", () => {
  it("keeps findings that affect declared direct dependencies", () => {
    const report = {
      advisories: {
        123: {
          module_name: "example",
          findings: [
            {
              version: "1.0.0",
              paths: [".>example", ".>other>example", ".>example>nested"],
            },
          ],
        },
      },
    };

    expect(filter_direct_advisories(report, ["example"])).toEqual({
      direct_advisories: [
        {
          module_name: "example",
          findings: [{ version: "1.0.0", paths: [".>example"] }],
        },
      ],
      ignored_transitive_advisories: 0,
      unclassified_findings: 0,
    });
  });

  it("ignores advisories that affect transitive dependencies only", () => {
    const report = {
      advisories: {
        123: {
          module_name: "transitive-package",
          findings: [
            {
              version: "1.0.0",
              paths: [".>declared-package>transitive-package"],
            },
          ],
        },
      },
    };

    expect(filter_direct_advisories(report, ["declared-package"])).toEqual({
      direct_advisories: [],
      ignored_transitive_advisories: 1,
      unclassified_findings: 0,
    });
  });

  it("fails classification when the audit omits dependency paths", () => {
    const report = {
      advisories: {
        123: {
          module_name: "unknown-package",
          findings: [{ version: "1.0.0" }],
        },
      },
    };

    expect(filter_direct_advisories(report, [])).toEqual({
      direct_advisories: [],
      ignored_transitive_advisories: 0,
      unclassified_findings: 1,
    });
  });
});
