import { buildScoreRubric, SCORE_NOT, type ScoreRubric as Rubric } from "../../../lib/score-rubric.ts";
import type { FinancialDistressResult } from "../../types.ts";
import { percent, ratio } from "../format.ts";
import { ScoreMeter } from "../hospital-display.tsx";

function formatValue(row: Rubric["included"][number]): string {
  if (row.hospitalValue === null) return "Not available";
  return row.unit === "percent" ? percent(row.hospitalValue) : ratio(row.hospitalValue);
}

function FactorBar({ row, maxPoints }: { row: Rubric["included"][number]; maxPoints: number }) {
  const points = row.weightedPoints ?? 0;
  const width = maxPoints > 0 ? Math.max(4, (points / maxPoints) * 100) : 0;
  return (
    <li className="rubric-row">
      <div className="rubric-row-head">
        <strong>{row.label}</strong>
        <span>{points.toFixed(2)} pts</span>
      </div>
      <div className="rubric-bar" aria-hidden="true">
        <span style={{ width: `${width}%` }} />
      </div>
      <p className="tiny">
        Value {formatValue(row)} · {row.direction === "lower_is_riskier" ? "Lower values raise concern" : "Higher values raise concern"} ·
        Healthy {row.unit === "percent" ? percent(row.healthy) : ratio(row.healthy)} · Concern{" "}
        {row.unit === "percent" ? percent(row.concern) : ratio(row.concern)}
      </p>
      <p className="tiny">
        Base weight {row.baseWeight.toFixed(2)} · Effective weight {row.effectiveWeight?.toFixed(4) ?? "n/a"}
      </p>
    </li>
  );
}

export function ScoreRubricPanel({
  result,
  compact = false,
}: {
  result: FinancialDistressResult;
  compact?: boolean;
}) {
  const rubric = buildScoreRubric(result);
  const maxPoints = Math.max(...rubric.included.map((row) => row.weightedPoints ?? 0), 1);
  return (
    <div className="score-rubric">
      <div className="score-with-how">
        <ScoreMeter score={result.score} status={result.status} />
        <details className="how-score" open={!compact}>
          <summary>How this score is calculated</summary>
          <p className="tiny">{rubric.experimentalNote}</p>
          <p className="tiny">{SCORE_NOT}</p>
          {result.score === null ? (
            <p>No factor could be scored. Status is Insufficient data, not Stable.</p>
          ) : (
            <>
              <p className="tiny">
                Unrounded total {rubric.unroundedScore?.toFixed(4) ?? "n/a"} · Rounded score {rubric.roundedScore} ·
                Category: {rubric.status}
              </p>
              <p className="tiny">
                Bands: {rubric.bands.map((band) => `${band.label} ${band.min}–${band.max}`).join(" · ")}
              </p>
              <ul className="rubric-list">
                {rubric.included.map((row) => (
                  <FactorBar key={row.id} row={row} maxPoints={maxPoints} />
                ))}
              </ul>
              {rubric.excluded.length > 0 ? (
                <details>
                  <summary>Excluded factors</summary>
                  <ul className="reason-list">
                    {rubric.excluded.map((row) => (
                      <li key={row.id}>
                        <strong>{row.label}</strong>
                        <p className="tiny">{row.exclusion ?? row.availability}</p>
                        <p className="tiny">Base weight {row.baseWeight.toFixed(2)} was renormalized away from the total.</p>
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
              <p className="tiny">{rubric.coverageNote}</p>
              <p className="tiny">{rubric.rounding}</p>
            </>
          )}
          <p>
            <a href="#methodology">View full scoring rubric</a>
          </p>
        </details>
      </div>
    </div>
  );
}

export function FullScoringRubric() {
  return (
    <details id="scoring-rubric">
      <summary>View full scoring rubric</summary>
      <p className="tiny">
        Thresholds and weights come from <code>lib/scoring-config.ts</code>. They are experimental assumptions. Effective
        weights change when a factor is excluded. Coverage is shown beside score history so report-to-report
        comparability can be checked.
      </p>
      <p className="tiny">{SCORE_NOT}</p>
    </details>
  );
}
