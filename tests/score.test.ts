import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { normalizeHospital, type HospitalExtractRecord } from "../lib/normalize-hospital.ts";
import { buildHospitalViews, type HospitalExtractFile } from "../lib/pipeline.ts";
import { buildPulseLineSignal } from "../lib/pulse-signal.ts";
import { flaggedExplanations, scoreFinancialDistress } from "../lib/score-financial.ts";
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

function hospitalFromFinancials(financials: HospitalFinancials): Hospital {
  return {
    id: "test",
    ccn: "180000",
    name: "Unit Test Hospital",
    city: "Jackson",
    state: "KY",
    zip: null,
    county: null,
    address: null,
    fiscalYearStart: null,
    fiscalYearEnd: "2024-06-30",
    financials,
    dataQuality: {
      identityStatus: "clear",
      missingFields: [],
      warnings: [],
      source: "unit-test",
      cmsCostReportAddress: null,
      otherDirectoryAddress: null,
    },
    sourceFieldMap: {},
    sourceFields: {},
    identityDiscrepancies: [],
    classification: "observed",
    provenance: { source: "unit-test", retrievedAt: null, notes: null },
  };
}

describe("financial distress scoring", () => {
  it("keeps missing financials as null and does not treat them as zero", () => {
    const result = scoreFinancialDistress(hospitalFromFinancials(emptyFinancials()));
    const cash = result.factors.find((factor) => factor.metric === "Cash / Liquidity");
    const current = result.factors.find((factor) => factor.metric === "Current Ratio");
    assert.equal(cash?.available, false);
    assert.equal(cash?.rawValue, null);
    assert.notEqual(cash?.rawValue, 0);
    assert.equal(current?.available, false);
    assert.ok(result.missingInputs.includes("Cash / Liquidity"));
    assert.ok(result.missingInputs.includes("Current Ratio"));
  });

  it("uses only available metrics and renormalizes weights", () => {
    const result = scoreFinancialDistress(
      hospitalFromFinancials(
        emptyFinancials({
          operatingMargin: -0.2,
        }),
      ),
    );
    const available = result.factors.filter((factor) => factor.available);
    assert.equal(available.length, 1);
    assert.equal(result.score, 100);
    assert.equal(result.status, "High Concern");
    assert.equal(result.confidence, "Low");
  });

  it("maps scores onto configurable status bands", () => {
    const stable = scoreFinancialDistress(
      hospitalFromFinancials(emptyFinancials({ operatingMargin: 0.12 })),
    );
    assert.equal(stable.score <= scoringConfig.statusThresholds.stableMax, true);
    assert.equal(stable.status, "Stable");

    const high = scoreFinancialDistress(
      hospitalFromFinancials(emptyFinancials({ operatingMargin: -0.2 })),
    );
    assert.equal(high.score > scoringConfig.statusThresholds.watchMax, true);
    assert.equal(high.status, "High Concern");
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
    const leverage = result.factors.find((factor) => factor.metric === "Liabilities / Assets");
    assert.equal(leverage?.available, false);
    assert.ok(leverage?.reason.includes("negative"));
  });

  it("emits deterministic explanations from scored factors", () => {
    const result = scoreFinancialDistress(
      hospitalFromFinancials(
        emptyFinancials({
          operatingRevenue: 100,
          operatingExpenses: 130,
          operatingIncome: -30,
          operatingMargin: -0.3,
          totalAssets: 50,
          totalLiabilities: 48,
        }),
      ),
    );
    const reasons = flaggedExplanations(result);
    assert.ok(reasons.some((reason) => reason.includes("Operating expenses exceeded")));
    assert.ok(reasons.some((reason) => reason.includes("Liabilities represent a high proportion")));
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

describe("CMS extract pipeline", () => {
  it("normalizes three observed Kentucky hospitals without inventing zeros", () => {
    const extract = JSON.parse(readFileSync(extractPath, "utf8")) as HospitalExtractFile;
    const views = buildHospitalViews(extract);
    assert.equal(views.length, 3);
    assert.ok(views.every((view) => view.hospital.state === "KY"));
    assert.ok(views.every((view) => view.hospital.classification === "observed"));
    assert.ok(views.every((view) => view.workforce.status === "not_available"));

    const river = views.find((view) => view.hospital.ccn === "180139");
    assert.ok(river);
    assert.equal(river.hospital.financials.cash, null);
    assert.equal(river.hospital.financials.currentAssets, null);
    assert.equal(river.hospital.dataQuality.identityStatus, "unresolved");
    assert.equal(river.hospital.dataQuality.cmsCostReportAddress, "400 Jett Drive");
    assert.equal(river.hospital.dataQuality.otherDirectoryAddress, "540 Jett Drive");
    assert.ok(river.hospital.identityDiscrepancies.some((item) => item.kind === "address_change"));

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
    assert.notEqual(hospital.financials.cash, 0);
    assert.ok(hospital.dataQuality.missingFields.includes("cash"));
  });
});
