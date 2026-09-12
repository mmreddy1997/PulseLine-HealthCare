import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { loadResearchDashboard } from "../lib/pipeline.ts";
import {
  comparableChange,
  compareTwoReports,
  currentRatioValue,
  financialStatement,
  guidedBrief,
  liabilitiesToAssetsValue,
  measureValue,
  MEASURES,
  patientServiceReconcile,
  periodAgeDays,
  periodMeta,
  periodsOverlap,
  safePercentChange,
} from "../lib/finance/index.ts";
import { evaluateScenario, resetScenarioInputs } from "../lib/scenario/whatif.ts";
import { buildScoreRubric } from "../lib/score-rubric.ts";
import { adaptEvidencePack } from "../lib/adapt-evidence.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const researchPack = JSON.parse(readFileSync(join(root, "research", "PulseLine_three_hospital_data.json"), "utf8"));
const evidencePack = JSON.parse(readFileSync(join(root, "research", "PulseLine_expanded_evidence_v1.json"), "utf8"));
const loaded = loadResearchDashboard(researchPack);
const evidence = adaptEvidencePack(evidencePack);

function facility(name: string) {
  const found = loaded.facilities.find((item) => item.name.includes(name));
  assert.ok(found);
  return found;
}

describe("source-to-display financial mapping", () => {
  it("maps CMS fields without treating missing as zero", () => {
    const river = facility("Kentucky River");
    const npr = measureValue(river.latest, "net_patient_revenue");
    assert.equal(npr.origin, "source_reported");
    assert.equal(npr.value, river.latest.hospital.financials.netPatientRevenue);
    assert.notEqual(npr.value, null);
    const missing = measureValue(
      {
        ...river.latest,
        hospital: { ...river.latest.hospital, financials: { ...river.latest.hospital.financials, cash: null } },
      },
      "cash",
    );
    assert.equal(missing.value, null);
    assert.notEqual(missing.value, 0);
    assert.match(missing.exclusion ?? "", /Missing/);
  });

  it("preserves negative values and excludes uninterpretable ratios", () => {
    const river = facility("Kentucky River");
    const cashPoints = river.reports.map((report) => report.hospital.financials.cash);
    assert.ok(cashPoints.some((value) => value !== null && value < 0));
    const morgan = facility("Morgan");
    const current = currentRatioValue(morgan.latest.hospital);
    const leverage = liabilitiesToAssetsValue(morgan.latest.hospital);
    assert.equal(current.excluded || leverage.excluded, true);
    assert.equal(current.value === null || leverage.value === null, true);
  });

  it("keeps publication dates separate from fiscal periods", () => {
    const breck = facility("Breckinridge");
    const meta = periodMeta(breck.latest, new Date("2026-09-12T00:00:00Z"));
    assert.match(breck.latest.hospital.fiscalYearEnd, /^\d{4}-\d{2}-\d{2}$/);
    assert.notEqual(String(breck.latest.hospital.fileCohort), breck.latest.hospital.fiscalYearEnd);
    assert.equal(meta.publicationStatus, breck.latest.hospital.publicationDate ? "verified_date" : "unverified");
    assert.match(meta.publicationLabel, /publication date/i);
    assert.match(meta.historicalNote, /not current/i);
    assert.ok((periodAgeDays(breck.latest.hospital.fiscalYearEnd, new Date("2026-09-12T00:00:00Z")) ?? 0) > 0);
  });
});

describe("fiscal-period comparability and safe percentages", () => {
  it("does not invent a percent change from missing or zero baselines", () => {
    assert.equal(safePercentChange(10, null), null);
    assert.equal(safePercentChange(null, 10), null);
    assert.equal(safePercentChange(10, 0), null);
    assert.equal(safePercentChange(12, 10), 20);
  });

  it("withholds an unqualified growth rate when periods overlap or lengths differ", () => {
    const breck = facility("Breckinridge");
    const [first, second] = breck.reports;
    assert.ok(first && second);
    const overlap = {
      ...second,
      hospital: {
        ...second.hospital,
        fiscalYearStart: first.hospital.fiscalYearStart,
        fiscalYearEnd: first.hospital.fiscalYearEnd,
      },
    };
    assert.equal(periodsOverlap(first, overlap), true);
    const blocked = compareTwoReports(overlap, first, "net_patient_revenue");
    assert.equal(blocked.comparable, false);
    const stretched = {
      ...second,
      hospital: { ...second.hospital, periodDays: 180 },
    };
    const duration = comparableChange(
      stretched,
      { ...first, hospital: { ...first.hospital, periodDays: 400 } },
      20,
      10,
      "net_patient_revenue",
    );
    assert.equal(duration.percent, null);
    assert.equal(duration.comparable, false);
  });
});

describe("financial statements and guided brief", () => {
  it("labels source-reported versus calculated rows and does not invent a complete statement", () => {
    const breck = facility("Breckinridge");
    const statement = financialStatement(breck.reports);
    assert.ok(statement.rows.some((row) => row.origin === "source_reported" && row.id === "net_patient_revenue"));
    assert.ok(statement.rows.some((row) => row.origin === "calculated" && row.id === "derived_patient_service_balance"));
    assert.ok(!statement.rows.some((row) => /ebitda|enterprise value/i.test(row.label)));
    const reconcile = patientServiceReconcile(breck.latest.hospital);
    if (reconcile.published !== null && reconcile.derived !== null) {
      assert.equal(typeof reconcile.note, "string");
    }
  });

  it("writes a deterministic brief from supported comparisons", () => {
    const morgan = facility("Morgan");
    const brief = guidedBrief(morgan.latest, morgan.reports, new Date("2026-09-12T00:00:00Z"));
    assert.ok(brief.records.some((line) => /Net patient revenue/i.test(line.text)));
    assert.ok(brief.changes.length > 0);
    assert.match(brief.exploratoryRule, /exploratory/);
    assert.ok(!brief.records.some((line) => /overall financial health/i.test(line.text)));
  });
});

describe("scenario isolation and research cases", () => {
  it("keeps historical records and scores unchanged after a scenario", () => {
    const item = facility("Breckinridge");
    const beforeScore = item.latest.financial.score;
    const beforeRevenue = item.latest.hospital.financials.netPatientRevenue;
    const shocked = evaluateScenario(item.latest, { revenueChangePct: 20, expenseChangePct: -8 });
    assert.equal(shocked.enabled, true);
    assert.equal(item.latest.financial.score, beforeScore);
    assert.equal(item.latest.hospital.financials.netPatientRevenue, beforeRevenue);
    const rubric = buildScoreRubric(item.latest.financial);
    assert.equal(rubric.roundedScore, item.latest.financial.score);
  });

  it("does not enable a financial model for research cases", () => {
    const research = evidence.ledger?.hospitals.find((item) => item.name.includes("Highlands"));
    assert.ok(research);
    const pending = evaluateScenario(null, resetScenarioInputs(), { pending: true, hospitalName: research.name });
    assert.equal(pending.enabled, false);
    assert.match(pending.disabledReason ?? "", /pending/i);
  });
});

describe("measure catalog", () => {
  it("documents the implemented financial definitions", () => {
    assert.equal(MEASURES.net_patient_revenue.cmsField, "Net Patient Revenue");
    assert.match(MEASURES.patient_service_result_ratio.not, /operating margin/i);
    assert.match(MEASURES.derived_patient_service_balance.not, /cash flow/i);
  });
});
