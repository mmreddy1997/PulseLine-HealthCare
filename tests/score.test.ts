import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { addressesDiffer } from "../lib/addresses.ts";
import { normalizeHospital, type HospitalExtractRecord } from "../lib/normalize-hospital.ts";
import { buildHospitalViews, loadDashboardExtract, type HospitalExtractFile } from "../lib/pipeline.ts";
import { buildPulseLineSignal } from "../lib/pulse-signal.ts";
import { flaggedExplanations, rankHospitalViews, scoreFinancialDistress } from "../lib/score-financial.ts";
import { scoringConfig } from "../lib/scoring-config.ts";
import { buildWorkforceSignal } from "../lib/workforce.ts";
import type { Hospital, HospitalFinancials } from "../src/types.ts";

const extractPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "data",
  "cms",
  "ky-rural-hospital-extract.json",
);

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

function hospitalFromFinancials(
  financials: HospitalFinancials,
  extras: Partial<Hospital> = {},
): Hospital {
  return {
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
    address: null,
    fiscalYearStart: null,
    fiscalYearEnd: "2024-06-30",
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
    provenance: { source: "unit-test", retrievedAt: null, notes: null },
    outcomeStatus: "unknown",
    ...extras,
  };
}

describe("financial distress scoring", () => {
  it("returns a null score and Insufficient data when all financials are missing", () => {
    const result = scoreFinancialDistress(hospitalFromFinancials(emptyFinancials()));
    assert.equal(result.score, null);
    assert.equal(result.status, "Insufficient data");
    assert.equal(result.dataCoverage, "None");
    assert.ok(flaggedExplanations(result)[0]?.includes("Insufficient data"));
    const pulse = buildPulseLineSignal(result, buildWorkforceSignal());
    assert.equal(pulse.triggered, false);
    assert.ok(pulse.missingSignals.includes("financial_distress"));
  });

  it("keeps missing financials as null and does not treat them as zero", () => {
    const result = scoreFinancialDistress(hospitalFromFinancials(emptyFinancials()));
    const cash = result.factors.find((factor) => factor.id === "liquidity");
    assert.equal(cash?.availability, "unavailable");
    assert.equal(cash?.rawValue, null);
    assert.notEqual(cash?.rawValue, 0);
  });

  it("uses only available metrics and renormalizes weights", () => {
    const result = scoreFinancialDistress(
      hospitalFromFinancials(emptyFinancials({ operatingMargin: -0.2 })),
    );
    const available = result.factors.filter((factor) => factor.available);
    assert.equal(available.length, 1);
    assert.equal(result.score, 100);
    assert.equal(result.status, "High Concern");
    assert.equal(result.dataCoverage, "Low");
    assert.equal(available[0]?.effectiveWeight, 1);
    assert.equal(available[0]?.weightedPoints, 100);
  });

  it("maps scores onto configurable status bands", () => {
    const stable = scoreFinancialDistress(
      hospitalFromFinancials(emptyFinancials({ operatingMargin: 0.12 })),
    );
    assert.ok(stable.score !== null && stable.score <= scoringConfig.statusThresholds.stableMax);
    assert.equal(stable.status, "Stable");

    const high = scoreFinancialDistress(
      hospitalFromFinancials(emptyFinancials({ operatingMargin: -0.2 })),
    );
    assert.ok(high.score !== null && high.score > scoringConfig.statusThresholds.watchMax);
    assert.equal(high.status, "High Concern");
  });

  it("does not treat negative revenue as healthy expense pressure", () => {
    const result = scoreFinancialDistress(
      hospitalFromFinancials(
        emptyFinancials({
          operatingRevenue: -100,
          operatingExpenses: 40,
        }),
      ),
    );
    const pressure = result.factors.find((factor) => factor.id === "expense_pressure");
    assert.equal(pressure?.availability, "invalid");
    assert.equal(pressure?.available, false);
    assert.equal(pressure?.normalizedRisk, null);
    assert.ok(pressure?.exclusion?.includes("negative"));
  });

  it("does not assume a 365-day reporting period from bed count", () => {
    const result = scoreFinancialDistress(
      hospitalFromFinancials(
        emptyFinancials({
          availableBeds: 10,
          inpatientDays: 10,
        }),
      ),
    );
    const volume = result.factors.find((factor) => factor.id === "patient_volume");
    assert.equal(volume?.availability, "unsupported");
    assert.ok(volume?.exclusion?.includes("365"));
  });

  it("does not score an uninterpretable negative liability ratio", () => {
    const result = scoreFinancialDistress(
      hospitalFromFinancials(
        emptyFinancials({
          totalAssets: 100,
          totalLiabilities: -50,
          operatingMargin: 0.05,
        }),
      ),
    );
    const leverage = result.factors.find((factor) => factor.id === "leverage");
    assert.equal(leverage?.availability, "invalid");
  });

  it("preserves negative cash and excludes the liquidity ratio", () => {
    const result = scoreFinancialDistress(
      hospitalFromFinancials(
        emptyFinancials({
          cash: -307635,
          operatingExpenses: 34542706,
        }),
      ),
    );
    const liquidity = result.factors.find((factor) => factor.id === "liquidity");
    assert.equal(liquidity?.availability, "invalid");
    assert.equal(liquidity?.rawValue, -307635);
    assert.ok(liquidity?.exclusion?.includes("negative"));
  });

  it("exposes reconstructable explanation fields", () => {
    const result = scoreFinancialDistress(
      hospitalFromFinancials(
        emptyFinancials({
          operatingRevenue: 100,
          operatingExpenses: 130,
          operatingMargin: -0.3,
          totalAssets: 50,
          totalLiabilities: 48,
        }),
      ),
    );
    const margin = result.factors.find((factor) => factor.id === "operating_margin");
    assert.ok(margin);
    assert.ok(margin?.formula.includes("operating"));
    assert.equal(margin?.healthy, scoringConfig.factors.operatingMargin.healthy);
    assert.equal(margin?.concern, scoringConfig.factors.operatingMargin.concern);
    assert.ok(margin?.effectiveWeight !== null);
    assert.ok(margin?.weightedPoints !== null);
    assert.ok(margin?.reason.includes("Raw value"));
    assert.ok(margin?.reason.includes("Effective weight"));
    assert.ok(result.reconstruction.rounding.includes("Math.round"));
    assert.ok(result.reconstruction.correlatedFactors.length >= 1);
  });

  it("ranks null scores after numeric scores", () => {
    const ranked = rankHospitalViews([
      { financial: scoreFinancialDistress(hospitalFromFinancials(emptyFinancials())) },
      { financial: scoreFinancialDistress(hospitalFromFinancials(emptyFinancials({ operatingMargin: -0.4 }))) },
    ]);
    assert.equal(ranked[0]?.financial.status, "High Concern");
    assert.equal(ranked[1]?.financial.status, "Insufficient data");
  });
});

describe("PulseLine signal", () => {
  it("does not trigger when workforce evidence is missing, even if financial stress is high", () => {
    const financial = scoreFinancialDistress(
      hospitalFromFinancials(emptyFinancials({ operatingMargin: -0.4 })),
    );
    const pulse = buildPulseLineSignal(financial, buildWorkforceSignal());
    assert.equal(financial.status, "High Concern");
    assert.equal(pulse.triggered, false);
    assert.equal(pulse.severity, "insufficient_evidence");
    assert.ok(pulse.reasons[0]?.includes("workforce evidence is not yet available"));
    assert.deepEqual(pulse.missingSignals, ["workforce_instability"]);
  });
});

describe("address mismatch", () => {
  it("does not flag identical addresses", () => {
    assert.equal(addressesDiffer("400 Jett Drive", "400 Jett Drive"), false);
    assert.equal(addressesDiffer("400 Jett Drive", "400  Jett Drive."), false);
    const hospital = normalizeHospital({
      id: "same",
      ccn: "180139",
      name: "Same Address Hospital",
      city: "Jackson",
      state: "KY",
      fiscalYearEnd: "2024-12-05",
      identityReviewStatus: "clear",
      classification: "observed",
      provenance: { source: "test", retrievedAt: null, notes: null },
      sourceFieldMap: {},
      sourceFields: {},
      financials: emptyFinancials(),
      cmsCostReportAddress: "400 Jett Drive",
      otherDirectoryAddress: "400 Jett Drive",
    });
    assert.equal(hospital.dataQuality.addressMismatch, false);
    assert.equal(
      hospital.dataQuality.warnings.includes("CMS cost-report address and another directory address do not match."),
      false,
    );
  });

  it("flags Kentucky River's unresolved street mismatch", () => {
    assert.equal(addressesDiffer("400 Jett Drive", "540 Jett Drive"), true);
  });
});

describe("CMS extract pipeline", () => {
  it("normalizes three Kentucky hospitals without inventing operating figures or zeros", () => {
    const extract = JSON.parse(readFileSync(extractPath, "utf8")) as HospitalExtractFile;
    const loaded = loadDashboardExtract(extract);
    assert.equal(loaded.ok, true);
    assert.equal(loaded.sourceVerification, "pending");
    assert.ok(loaded.missingEvidence.length > 0);
    const views = loaded.views;
    assert.equal(views.length, 3);

    const river = views.find((view) => view.hospital.ccn === "180139");
    assert.ok(river);
    assert.equal(river.hospital.financials.operatingRevenue, null);
    assert.equal(river.hospital.financials.operatingExpenses, null);
    assert.equal(river.hospital.financials.operatingIncome, null);
    assert.equal(river.hospital.sourceFields["hcris.total_revenues"], 35300000);
    assert.equal(river.hospital.dataQuality.addressMismatch, true);
    assert.equal(river.hospital.dataQuality.cmsCostReportAddress, "400 Jett Drive");
    assert.equal(river.hospital.dataQuality.otherDirectoryAddress, "540 Jett Drive");

    const expense = river.financial.factors.find((factor) => factor.id === "expense_pressure");
    assert.equal(expense?.availability, "unsupported");

    const tug = views.find((view) => view.hospital.ccn === "180069");
    assert.equal(tug?.hospital.financials.totalLiabilities, -28700000);
  });

  it("preserves nulls during normalize", () => {
    const record: HospitalExtractRecord = {
      id: "x",
      ccn: "018001",
      name: "Normalize Test",
      city: "Jackson",
      state: "KY",
      fiscalYearEnd: "2024-06-30",
      identityReviewStatus: "clear",
      classification: "observed",
      provenance: { source: "test", retrievedAt: null, notes: null },
      sourceFieldMap: {},
      sourceFields: { "hcris.cash": null },
      financials: emptyFinancials({ operatingMargin: 0.01, cash: null }),
    };
    const hospital = normalizeHospital(record);
    assert.equal(hospital.ccn, "018001");
    assert.equal(hospital.financials.cash, null);
    assert.ok(hospital.dataQuality.missingFields.includes("cash"));
  });

  it("still builds views from a valid extract via buildHospitalViews", () => {
    const extract = JSON.parse(readFileSync(extractPath, "utf8")) as HospitalExtractFile;
    const views = buildHospitalViews(extract);
    assert.equal(views.length, 3);
  });
});
