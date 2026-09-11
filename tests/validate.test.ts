import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  validateCostReportObservation,
  validateCostReportPayload,
} from "../src/validate.ts";
import type { CostReportObservation } from "../src/types.ts";

const fixturePath = join(
  dirname(fileURLToPath(import.meta.url)),
  "fixtures",
  "simulated-cost-reports.json",
);

function validObservation(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    hospital: {
      name: "Placeholder Ridge Make-Believe Community Hospital",
      ccn: "180111",
      city: "Placeholder Ridge",
      state: "KY",
      address: "1 Imaginary Oak Court, Placeholder Ridge, KY 40002",
      identityReviewStatus: "clear",
      ...(typeof overrides.hospital === "object" && overrides.hospital !== null
        ? (overrides.hospital as Record<string, unknown>)
        : {}),
    },
    fiscalPeriodStart: "2023-01-01",
    fiscalPeriodEnd: "2023-12-31",
    sourceFields: {
      worksheet_g3_line_29_net_income: null,
    },
    provenance: {
      source: "fictional-test-fixture",
      retrievedAt: null,
      notes: "Simulated record only. Not a real CMS observation.",
    },
    classification: "simulated",
    missingData: [],
    identityDiscrepancies: [],
    ...Object.fromEntries(Object.entries(overrides).filter(([key]) => key !== "hospital")),
  };
}

describe("validateCostReportObservation", () => {
  it("accepts a valid simulated record", () => {
    const result = validateCostReportObservation(validObservation());
    assert.equal(result.ok, true);
    assert.equal(result.errors.length, 0);
    assert.ok(result.value);
    assert.equal(
      result.value.hospital.name,
      "Placeholder Ridge Make-Believe Community Hospital",
    );
    assert.equal(result.value.classification, "simulated");
  });

  it("preserves a CCN with a leading zero as a six-digit string", () => {
    const result = validateCostReportObservation(
      validObservation({
        hospital: { ccn: "018042" },
      }),
    );
    assert.equal(result.ok, true);
    assert.equal(result.value?.hospital.ccn, "018042");
    assert.equal(typeof result.value?.hospital.ccn, "string");
    assert.notEqual(result.value?.hospital.ccn, "18042");
  });

  it("rejects a numeric CCN instead of coercing it", () => {
    const result = validateCostReportObservation(
      validObservation({
        hospital: { ccn: 18042 },
      }),
    );
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((error) => error.code === "INVALID_CCN"));
    assert.equal(result.value, undefined);
  });

  it("keeps missing financial values as null and does not treat them as zero", () => {
    const result = validateCostReportObservation(
      validObservation({
        sourceFields: {
          worksheet_g3_line_29_net_income: null,
          worksheet_s3_fte_nurses: null,
        },
        missingData: [
          {
            field: "worksheet_g3_line_29_net_income",
            reason: "Missing in this simulated fixture; not zero.",
          },
        ],
      }),
    );
    assert.equal(result.ok, true);
    assert.equal(result.value?.sourceFields.worksheet_g3_line_29_net_income, null);
    assert.equal(result.value?.sourceFields.worksheet_s3_fte_nurses, null);
    assert.notEqual(result.value?.sourceFields.worksheet_g3_line_29_net_income, 0);
  });

  it("rejects missing required fields", () => {
    const result = validateCostReportObservation({
      hospital: {
        name: "Nameless Fiction Infirmary",
      },
    });
    assert.equal(result.ok, false);
    const codes = result.errors.map((error) => error.code);
    assert.ok(codes.includes("MISSING_REQUIRED_FIELD"));
    assert.ok(result.errors.some((error) => error.path.includes("ccn")));
    assert.ok(result.errors.some((error) => error.path.includes("fiscalPeriodStart")));
  });

  it("rejects malformed input", () => {
    const result = validateCostReportObservation("not-an-observation");
    assert.equal(result.ok, false);
    assert.equal(result.errors[0]?.code, "MALFORMED_INPUT");
  });

  it("rejects impossible calendar dates without repairing them", () => {
    const result = validateCostReportObservation(
      validObservation({
        fiscalPeriodStart: "2023-02-30",
        fiscalPeriodEnd: "2023-12-31",
      }),
    );
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((error) => error.code === "INVALID_DATE"));
    assert.ok(result.errors.some((error) => error.message.includes("2023-02-30")));
  });

  it("rejects a reversed fiscal period without swapping the dates", () => {
    const result = validateCostReportObservation(
      validObservation({
        fiscalPeriodStart: "2024-12-31",
        fiscalPeriodEnd: "2024-01-01",
      }),
    );
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((error) => error.code === "REVERSED_FISCAL_PERIOD"));
    assert.ok(result.errors.some((error) => error.message.includes("were not swapped")));
  });

  it("rejects a hospital outside Kentucky", () => {
    const result = validateCostReportObservation(
      validObservation({
        hospital: {
          city: "Elsewhere",
          state: "OH",
          address: "9 Out-of-Scope Lane, Elsewhere, OH 43000",
        },
      }),
    );
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((error) => error.code === "OUT_OF_SCOPE_STATE"));
  });

  it("warns on an unresolved identity discrepancy and does not infer a physician departure", () => {
    const result = validateCostReportObservation(
      validObservation({
        hospital: { identityReviewStatus: "unresolved" },
        identityDiscrepancies: [
          {
            kind: "address_change",
            description: "Simulated mailing address differs from a prior fictional listing.",
            resolved: false,
            physicianDeparture: true,
          },
        ],
      }),
    );
    assert.equal(result.ok, true);
    assert.ok(
      result.warnings.some((warning) => warning.code === "UNRESOLVED_IDENTITY_REVIEW"),
    );
    assert.ok(
      result.warnings.some((warning) => warning.code === "UNRESOLVED_IDENTITY_DISCREPANCY"),
    );
    assert.ok(
      result.warnings.some(
        (warning) => warning.code === "ADDRESS_CHANGE_NOT_PHYSICIAN_DEPARTURE",
      ),
    );
    assert.equal(result.value?.identityDiscrepancies[0]?.kind, "address_change");
    assert.equal(
      Object.prototype.hasOwnProperty.call(result.value?.identityDiscrepancies[0], "physicianDeparture"),
      false,
    );
  });
});

describe("simulated fixtures", () => {
  it("loads only fictional simulated records from the fixture file", () => {
    const payload = JSON.parse(readFileSync(fixturePath, "utf8")) as {
      disclaimer: string;
      observations: CostReportObservation[];
    };
    assert.match(payload.disclaimer, /FICTIONAL SIMULATED FIXTURES/);
    assert.match(payload.disclaimer, /not CMS cost-report observations/);

    const batch = validateCostReportPayload(payload);
    assert.equal(batch.ok, true);
    assert.equal(batch.results.length, 2);
    for (const result of batch.results) {
      assert.equal(result.value?.classification, "simulated");
      assert.equal(result.value?.provenance.source, "fictional-test-fixture");
    }
    assert.equal(batch.results[0]?.value?.hospital.ccn, "018042");
    assert.equal(batch.results[0]?.value?.sourceFields.worksheet_g3_line_29_net_income, null);
  });
});
