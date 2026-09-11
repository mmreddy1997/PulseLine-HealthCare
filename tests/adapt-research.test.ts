import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { adaptResearchPack, parseCmsNumeric } from "../lib/adapt-research.ts";
import { loadResearchDashboard } from "../lib/pipeline.ts";

const researchPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "research",
  "PulseLine_three_hospital_data.json",
);

describe("research adapter", () => {
  it("parses CMS numeric strings and rejects malformed values", () => {
    assert.equal(parseCmsNumeric("35283871", "x").value, 35283871);
    assert.equal(parseCmsNumeric("-307635", "x").value, -307635);
    assert.equal(parseCmsNumeric(null, "x").value, null);
    const bad = parseCmsNumeric("not-a-number", "$.field");
    assert.equal(bad.value, null);
    assert.equal(bad.error?.code, "INVALID_TYPE");
    assert.ok(bad.error?.message.includes("not treated as missing"));
  });

  it("adapts 12 hospital-year reports without inventing operating margins", () => {
    const pack = JSON.parse(readFileSync(researchPath, "utf8"));
    const adapted = adaptResearchPack(pack);
    assert.equal(adapted.ok, true);
    assert.equal(adapted.extract?.observations.length, 12);
    assert.ok(adapted.extract?.observations.every((row) => row.financials.operatingMargin === null));
    assert.ok(adapted.extract?.observations.every((row) => row.financials.operatingRevenue === null));
    assert.ok(adapted.extract?.observations.every((row) => typeof row.sourceFields["Net Patient Revenue"] === "string"));

    const loaded = loadResearchDashboard(pack);
    assert.equal(loaded.ok, true);
    assert.equal(loaded.views.length, 12);
    assert.equal(loaded.facilities.length, 3);
    assert.deepEqual(
      loaded.facilities.map((facility) => facility.hospitalId).sort(),
      ["KY-LIC-100620", "KY-LIC-600058", "KY-LIC-600070"],
    );

    const river = loaded.facilities.find((facility) => facility.hospitalId === "KY-LIC-100620");
    assert.ok(river);
    assert.equal(river.reports.length, 4);
    assert.equal(river.latest.hospital.currentCcn, "181334");
    assert.equal(river.latest.hospital.historicalCcn, "180139");
    assert.equal(river.latest.hospital.ccnAsReported, "180139");
    assert.equal(river.latest.hospital.fiscalYearEnd, "2024-08-31");
    assert.equal(river.latest.hospital.reportRecordId, "798161");
    assert.equal(river.latest.hospital.fileCohort, 2023);
    assert.ok(river.latest.hospital.sourceUrl?.includes("CostReport_2023_Final.csv"));
    assert.equal(river.latest.hospital.dataQuality.addressMismatch, true);
    assert.ok(river.latest.hospital.identityDiscrepancies.some((item) => item.kind === "ccn_conflict" && !item.resolved));
    assert.ok(river.latest.financial.factors.some((factor) => factor.id === "operating_margin" && factor.availability === "unsupported"));
    assert.ok(river.latest.hospital.financials.cash !== null && river.latest.hospital.financials.cash < 0);
    assert.ok(
      river.latest.financial.factors.some(
        (factor) => factor.id === "liquidity" && factor.availability === "invalid" && factor.rawValue === river.latest.hospital.financials.cash,
      ),
    );
    assert.equal(typeof river.latest.hospital.sourceFields["Net Patient Revenue"], "string");
    assert.ok(!JSON.stringify(river.latest.hospital.financials).includes("1298"));

    const morgan = loaded.facilities.find((facility) => facility.hospitalId === "KY-LIC-600058");
    const leverage = morgan?.latest.financial.factors.find((factor) => factor.id === "leverage");
    assert.equal(leverage?.availability, "invalid");
    assert.ok((morgan?.latest.hospital.financials.totalLiabilities ?? 0) < 0);
  });

  it("rejects null hospital and report entries with structured errors", () => {
    const pack = JSON.parse(readFileSync(researchPath, "utf8")) as {
      hospitals: unknown[];
      hospital_year_reports: unknown[];
    };
    pack.hospitals.push(null);
    pack.hospital_year_reports.push(null);
    const adapted = adaptResearchPack(pack);
    assert.equal(adapted.ok, false);
    assert.ok(adapted.errors.some((error) => error.path.includes("hospitals") && error.message.includes("null")));
    assert.ok(adapted.errors.some((error) => error.path.includes("hospital_year_reports") && error.message.includes("null")));
  });

  it("rejects an unresolved source reference", () => {
    const pack = JSON.parse(readFileSync(researchPath, "utf8")) as {
      hospital_year_reports: { source_id: string }[];
    };
    pack.hospital_year_reports[0].source_id = "MISSING_SOURCE";
    const adapted = adaptResearchPack(pack);
    assert.equal(adapted.ok, false);
    assert.ok(adapted.errors.some((error) => error.code === "DANGLING_REFERENCE"));
  });

  it("rejects a malformed CMS numeric string in a report", () => {
    const pack = JSON.parse(readFileSync(researchPath, "utf8")) as {
      hospital_year_reports: { original_cms_fields: Record<string, unknown> }[];
    };
    pack.hospital_year_reports[0].original_cms_fields["Net Patient Revenue"] = "12,000";
    const adapted = adaptResearchPack(pack);
    assert.equal(adapted.ok, false);
    assert.ok(adapted.errors.some((error) => error.message.includes("Malformed CMS numeric string")));
  });
});
