import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { investigationNextSteps } from "../lib/investigate.ts";
import { scoreFinancialDistress } from "../lib/score-financial.ts";
import { buildPulseLineSignal } from "../lib/pulse-signal.ts";
import { buildWorkforceSignal } from "../lib/workforce.ts";
import type { Hospital, HospitalFinancials, HospitalView } from "../src/types.ts";

function emptyFinancials(overrides: Partial<HospitalFinancials> = {}): HospitalFinancials {
  return {
    netPatientRevenue: null,
    operatingRevenue: null,
    operatingExpenses: null,
    operatingIncome: null,
    operatingMargin: null,
    totalAssets: null,
    totalLiabilities: null,
    currentAssets: null,
    currentLiabilities: null,
    cash: null,
    inpatientDays: null,
    discharges: null,
    availableBeds: null,
    bedDaysAvailable: null,
    uncompensatedCare: null,
    ...overrides,
  };
}

function viewFromFinancials(financials: HospitalFinancials): HospitalView {
  const hospital: Hospital = {
    id: "test",
    hospitalId: "test",
    ccn: "180000",
    currentCcn: "180000",
    historicalCcn: "180000",
    ccnAsReported: "180000",
    name: "Unit Test Hospital",
    city: "Jackson",
    state: "KY",
    zip: null,
    county: null,
    countyFips: null,
    ownershipCategory: null,
    ruralClassification: null,
    address: null,
    fiscalYearStart: "2023-01-01",
    fiscalYearEnd: "2023-12-31",
    reportRecordId: null,
    fileCohort: null,
    sourceId: null,
    sourceUrl: null,
    periodDays: null,
    financials,
    dataQuality: {
      identityStatus: "clear",
      missingFields: [],
      warnings: [],
      source: "unit-test",
      cmsCostReportAddress: null,
      otherDirectoryAddress: null,
      addressMismatch: false,
      addressEvidence: [],
      sourceVerification: "pending",
    },
    sourceFieldMap: {},
    sourceFields: {},
    metricDefinitions: {},
    identityDiscrepancies: [],
    classification: "observed",
    provenance: { source: "unit-test", retrievedAt: "2026-09-11", notes: null },
    outcomeStatus: "unknown",
  };
  const financial = scoreFinancialDistress(hospital);
  const workforce = buildWorkforceSignal();
  return { hospital, financial, workforce, pulse: buildPulseLineSignal(financial, workforce) };
}

describe("investigation advice", () => {
  it("does not recommend operating-margin worksheet checks when margin is unsupported", () => {
    const view = viewFromFinancials(
      emptyFinancials({
        netPatientRevenue: 19669554,
        operatingExpenses: 21707664,
        cash: 18207,
        totalAssets: 9376605,
        totalLiabilities: -2761125,
        currentAssets: 1854222,
        currentLiabilities: -3051866,
        inpatientDays: 1939,
        bedDaysAvailable: 9150,
      }),
    );
    const steps = investigationNextSteps(view);
    assert.ok(steps.every((step) => !step.includes("operating-margin figure")));
    assert.ok(steps.some((step) => step.includes("available factors only")));
    assert.ok(steps.some((step) => step.includes("patient-service expense pressure")));
    assert.ok(steps.some((step) => step.includes("very small valid ratio")));
  });
});
