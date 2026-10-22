import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function filter_direct_advisories(audit_report, direct_dependencies) {
  const direct_dependency_names = new Set(direct_dependencies);
  const direct_advisories = [];
  let ignored_transitive_advisories = 0;
  let unclassified_findings = 0;

  for (const advisory of Object.values(audit_report.advisories ?? {})) {
    const findings = advisory.findings ?? [];
    const direct_findings = (advisory.findings ?? [])
      .map((finding) => ({
        ...finding,
        paths: (finding.paths ?? []).filter((dependency_path) => {
          const path_segments = dependency_path.split(">");
          const dependency_name = path_segments[1];
          return (
            path_segments.length === 2 &&
            dependency_name === advisory.module_name &&
            direct_dependency_names.has(dependency_name)
          );
        }),
      }))
      .filter((finding) => finding.paths.length > 0);

    if (direct_findings.length > 0) {
      direct_advisories.push({ ...advisory, findings: direct_findings });
    } else if (
      findings.length > 0 &&
      findings.every(
        (finding) => Array.isArray(finding.paths) && finding.paths.length > 0,
      )
    ) {
      ignored_transitive_advisories += 1;
    } else if (findings.length > 0) {
      unclassified_findings += findings.filter(
        (finding) =>
          !Array.isArray(finding.paths) || finding.paths.length === 0,
      ).length;
    }
  }

  return {
    direct_advisories,
    ignored_transitive_advisories,
    unclassified_findings,
  };
}

function run_direct_dependency_audit() {
  const package_json = JSON.parse(readFileSync("package.json", "utf8"));
  const direct_dependencies = [
    ...Object.keys(package_json.dependencies ?? {}),
    ...Object.keys(package_json.devDependencies ?? {}),
    ...Object.keys(package_json.optionalDependencies ?? {}),
    ...Object.keys(package_json.peerDependencies ?? {}),
  ];
  const audit_process = spawnSync("pnpm", ["audit", "--json"], {
    encoding: "utf8",
  });

  if (audit_process.error) {
    console.error(`Could not run pnpm audit: ${audit_process.error.message}`);
    process.exitCode = 1;
    return;
  }

  let audit_report;
  try {
    audit_report = JSON.parse(audit_process.stdout);
  } catch {
    console.error(
      audit_process.stderr || "pnpm audit returned an invalid JSON report.",
    );
    process.exitCode = audit_process.status || 1;
    return;
  }

  if (audit_process.stderr) {
    process.stderr.write(audit_process.stderr);
  }

  const {
    direct_advisories,
    ignored_transitive_advisories,
    unclassified_findings,
  } = filter_direct_advisories(audit_report, direct_dependencies);

  if (direct_advisories.length === 0) {
    console.log("No vulnerabilities found in direct dependencies.");
    if (ignored_transitive_advisories > 0) {
      console.log(
        `Ignored transitive-only advisories: ${ignored_transitive_advisories}.`,
      );
    }
    if (unclassified_findings > 0) {
      console.error(
        `Could not classify ${unclassified_findings} vulnerability finding(s); failing closed.`,
      );
      process.exitCode = 1;
      return;
    }
    if (
      audit_process.status !== 0 &&
      (audit_process.status !== 1 || ignored_transitive_advisories === 0)
    ) {
      process.exitCode = audit_process.status || 1;
    }
    return;
  }

  for (const advisory of direct_advisories) {
    console.error(
      `${advisory.severity.toUpperCase()}: ${advisory.module_name} - ${advisory.title} (${advisory.github_advisory_id})`,
    );
    for (const finding of advisory.findings) {
      console.error(`  Affected version: ${finding.version}`);
      for (const dependency_path of finding.paths) {
        console.error(`  Direct dependency path: ${dependency_path}`);
      }
    }
  }

  process.exitCode = 1;
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  run_direct_dependency_audit();
}
