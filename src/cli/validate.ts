import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { validateCostReportPayload } from "../validate.ts";

function printUsage(): void {
  console.error("Usage: npm run validate -- <path-to-json>");
  console.error("Example: npm run validate -- tests/fixtures/simulated-cost-reports.json");
}

function printIssues(
  label: "Error" | "Warning",
  issues: { code: string; path: string; message: string }[],
): void {
  for (const issue of issues) {
    console.log(`${label} [${issue.code}] ${issue.path}: ${issue.message}`);
  }
}

const fileArg = process.argv[2];
if (!fileArg) {
  printUsage();
  process.exit(1);
}

const filePath = resolve(process.cwd(), fileArg);
let parsed: unknown;
try {
  parsed = JSON.parse(readFileSync(filePath, "utf8"));
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Could not read or parse ${filePath}: ${message}`);
  process.exit(1);
}

const result = validateCostReportPayload(parsed);

console.log(`Validated ${result.results.length} record(s) from ${fileArg}.`);
printIssues("Error", result.errors);
printIssues("Warning", result.warnings);

if (result.ok) {
  const warningNote =
    result.warnings.length > 0 ? ` with ${result.warnings.length} warning(s)` : "";
  console.log(`Validation passed${warningNote}.`);
  process.exit(0);
}

console.error(
  `Validation failed with ${result.errors.length} error(s) and ${result.warnings.length} warning(s).`,
);
process.exit(1);
