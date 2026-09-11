import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { loadDashboardExtract } from "../lib/pipeline.ts";
import { validateHospitalExtract } from "../lib/validate-extract.ts";

const extractPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "data",
  "cms",
  "ky-rural-hospital-extract.json",
);

function validExtract(): Record<string, unknown> {
  return JSON.parse(readFileSync(extractPath, "utf8")) as Record<string, unknown>;
}

describe("dashboard extract validation", () => {
  it("accepts the bundled extract and unknown fiscal starts", () => {
    const result = validateHospitalExtract(validExtract());
    assert.equal(result.ok, true);
    assert.ok(result.value?.observations.every((item) => item.fiscalYearStart == null));
  });

  it("rejects an empty dataset", () => {
    const payload = validExtract();
    payload.observations = [];
    const result = validateHospitalExtract(payload);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((error) => error.code === "EMPTY_DATASET"));
    const loaded = loadDashboardExtract(payload);
    assert.equal(loaded.ok, false);
    assert.equal(loaded.views.length, 0);
  });

  it("rejects a malformed CCN", () => {
    const payload = validExtract();
    const observations = payload.observations as Record<string, unknown>[];
    observations[0] = { ...observations[0], ccn: "18013" };
    const result = validateHospitalExtract(payload);
    assert.ok(result.errors.some((error) => error.code === "INVALID_CCN"));
  });

  it("rejects a hospital outside Kentucky", () => {
    const payload = validExtract();
    const observations = payload.observations as Record<string, unknown>[];
    observations[0] = { ...observations[0], state: "OH" };
    const result = validateHospitalExtract(payload);
    assert.ok(result.errors.some((error) => error.code === "OUT_OF_SCOPE_STATE"));
  });

  it("rejects an impossible fiscal end date", () => {
    const payload = validExtract();
    const observations = payload.observations as Record<string, unknown>[];
    observations[0] = { ...observations[0], fiscalYearEnd: "2024-02-30" };
    const result = validateHospitalExtract(payload);
    assert.ok(result.errors.some((error) => error.code === "INVALID_DATE"));
  });

  it("rejects duplicate hospital/report records", () => {
    const payload = validExtract();
    const observations = payload.observations as Record<string, unknown>[];
    payload.observations = [observations[0], { ...observations[0], id: "dup" }];
    const result = validateHospitalExtract(payload);
    assert.ok(result.errors.some((error) => error.code === "DUPLICATE_RECORD"));
  });

  it("rejects missing financials instead of crashing later", () => {
    const payload = validExtract();
    const observations = payload.observations as Record<string, unknown>[];
    const first = { ...(observations[0] as Record<string, unknown>) };
    delete first.financials;
    observations[0] = first;
    const result = validateHospitalExtract(payload);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((error) => error.code === "MISSING_REQUIRED_FIELD" && error.path.includes("financials")));
  });

  it("rejects missing provenance instead of crashing later", () => {
    const payload = validExtract();
    const observations = payload.observations as Record<string, unknown>[];
    const first = { ...(observations[0] as Record<string, unknown>) };
    delete first.provenance;
    observations[0] = first;
    const result = validateHospitalExtract(payload);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((error) => error.path.includes("provenance")));
  });

  it("rejects a reversed fiscal period", () => {
    const payload = validExtract();
    const observations = payload.observations as Record<string, unknown>[];
    observations[0] = { ...observations[0], fiscalYearStart: "2024-12-31", fiscalYearEnd: "2024-01-01" };
    const result = validateHospitalExtract(payload);
    assert.ok(result.errors.some((error) => error.code === "REVERSED_FISCAL_PERIOD"));
  });

  it("rejects duplicate record ids", () => {
    const payload = validExtract();
    const observations = payload.observations as Record<string, unknown>[];
    payload.observations = [
      observations[0],
      { ...observations[1], id: (observations[0] as { id: string }).id, ccn: "180999", fiscalYearEnd: "2020-01-01" },
    ];
    const result = validateHospitalExtract(payload);
    assert.ok(result.errors.some((error) => error.message.includes("Duplicate record id")));
  });

  it("rejects a malformed financial type instead of coercing it", () => {
    const payload = validExtract();
    const observations = payload.observations as Record<string, unknown>[];
    const financials = { ...(observations[0].financials as Record<string, unknown>), cash: "12,000" };
    observations[0] = { ...observations[0], financials };
    const result = validateHospitalExtract(payload);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((error) => error.code === "INVALID_TYPE" && error.path.includes("cash")));
  });

  it("rejects an invalid identity-review enum", () => {
    const payload = validExtract();
    const observations = payload.observations as Record<string, unknown>[];
    observations[0] = { ...observations[0], identityReviewStatus: "maybe" };
    const result = validateHospitalExtract(payload);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((error) => error.code === "INVALID_ENUM" && error.path.includes("identityReviewStatus")));
  });

  it("rejects missing sourceFields instead of crashing later", () => {
    const payload = validExtract();
    const observations = payload.observations as Record<string, unknown>[];
    const first = { ...(observations[0] as Record<string, unknown>) };
    delete first.sourceFields;
    observations[0] = first;
    const result = validateHospitalExtract(payload);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((error) => error.code === "MISSING_REQUIRED_FIELD" && error.path.includes("sourceFields")));
  });
});
