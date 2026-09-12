import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  financialChartSeries,
  reportsComparable,
  safePercentChange,
} from "../lib/charts/series.ts";
import { loadResearchDashboard } from "../lib/pipeline.ts";
import type { HospitalView } from "../src/types.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const researchPack = JSON.parse(readFileSync(join(root, "research", "PulseLine_three_hospital_data.json"), "utf8"));
const loaded = loadResearchDashboard(researchPack);

function facility(name: string) {
  const found = loaded.facilities.find((item) => item.name.includes(name));
  assert.ok(found);
  return found;
}

describe("financial chart series", () => {
  it("preserves missing and negative values without coercing them to zero", () => {
    const river = facility("Kentucky River");
    const cash = financialChartSeries(river.reports).find((series) => series.id === "cash");
    assert.ok(cash);
    assert.ok(cash.points.some((point) => point.value !== null && point.value < 0));
    assert.ok(!cash.points.some((point) => point.value === 0 && point.exclusion?.includes("Missing")));
    const empty: HospitalView = {
      ...river.latest,
      hospital: {
        ...river.latest.hospital,
        financials: { ...river.latest.hospital.financials, cash: null, netPatientRevenue: null },
      },
    };
    const missing = financialChartSeries([empty]).find((series) => series.id === "cash");
    assert.equal(missing?.points[0]?.value, null);
    assert.notEqual(missing?.points[0]?.value, 0);
    assert.match(missing?.points[0]?.exclusion ?? "", /Missing/);
  });

  it("uses fiscal dates and flags incomparable period lengths", () => {
    const breck = facility("Breckinridge");
    const series = financialChartSeries(breck.reports).find((item) => item.id === "npr_expenses");
    assert.ok(series);
    assert.ok(series.points.every((point) => /^\d{4}-\d{2}-\d{2}$/.test(point.end)));
    assert.ok(!series.points.some((point) => String(point.fileCohort) === point.end));
    const stretched = breck.reports.map((report, index) => ({
      ...report,
      hospital: { ...report.hospital, periodDays: index === 0 ? 180 : 400 },
    }));
    const comparability = reportsComparable(stretched);
    assert.equal(comparability.comparable, false);
    assert.match(comparability.note, /30 days/);
  });

  it("does not invent a percent change from missing or zero baselines", () => {
    assert.equal(safePercentChange(10, null), null);
    assert.equal(safePercentChange(null, 10), null);
    assert.equal(safePercentChange(10, 0), null);
    assert.equal(safePercentChange(12, 10), 20);
  });
});
