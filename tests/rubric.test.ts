import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { buildScoreRubric, includedPointsSum } from "../lib/score-rubric.ts";
import { scoringConfig } from "../lib/scoring-config.ts";
import { loadResearchDashboard } from "../lib/pipeline.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const researchPack = JSON.parse(readFileSync(join(root, "research", "PulseLine_three_hospital_data.json"), "utf8"));
const loaded = loadResearchDashboard(researchPack);
assert.equal(loaded.ok, true);

describe("score rubric", () => {
  it("matches the live scoring reconstruction and config bands", () => {
    for (const facility of loaded.facilities) {
      const result = facility.latest.financial;
      const rubric = buildScoreRubric(result);
      assert.equal(rubric.roundedScore, result.score);
      assert.equal(rubric.unroundedScore, result.reconstruction.unroundedScore);
      assert.equal(rubric.status, result.status);
      assert.equal(rubric.weightSum, result.reconstruction.weightSum);
      assert.equal(rubric.bands[0]?.max, scoringConfig.statusThresholds.stableMax);
      assert.equal(rubric.bands[1]?.max, scoringConfig.statusThresholds.watchMax);
      if (result.score !== null && result.reconstruction.unroundedScore !== null) {
        assert.ok(Math.abs(includedPointsSum(rubric) - result.reconstruction.unroundedScore) < 1e-9);
        assert.equal(Math.round(includedPointsSum(rubric)), result.score);
      }
      for (const row of rubric.included) {
        const factor = result.factors.find((item) => item.id === row.id);
        assert.equal(row.baseWeight, factor?.baseWeight);
        assert.equal(row.effectiveWeight, factor?.effectiveWeight);
        assert.equal(row.weightedPoints, factor?.weightedPoints);
      }
    }
  });
});
