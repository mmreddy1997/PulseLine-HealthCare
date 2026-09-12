import type { HospitalView } from "../../types.ts";
import { guidedBrief } from "../../../lib/finance/index.ts";

export function GuidedBrief({
  view,
  reports,
  compact = false,
}: {
  view: HospitalView;
  reports: HospitalView[];
  compact?: boolean;
}) {
  const brief = guidedBrief(view, reports);
  return (
    <section className={`guided-brief ${compact ? "is-compact" : ""}`} aria-labelledby="brief-title">
      <h3 id="brief-title">{compact ? "Takeaway" : "Guided financial brief"}</h3>
      {compact ? null : (
        <p className="tiny">Generated from the selected report and documented comparability rules. Not a model summary.</p>
      )}
      <h4>What the available records show</h4>
      <ul className="brief-list">
        {(compact ? brief.records.slice(0, 2) : brief.records).map((line) => (
          <li key={line.id}>{line.text}</li>
        ))}
      </ul>
      <h4>What changed</h4>
      <ul className="brief-list">
        {(compact ? brief.changes.slice(0, 1) : brief.changes).map((line) => (
          <li key={line.id}>{line.text}</li>
        ))}
      </ul>
      <h4>What needs verification</h4>
      <ul className="brief-list">
        {(compact ? brief.investigate.slice(0, 1) : brief.investigate).map((line) => (
          <li key={line.id}>{line.text}</li>
        ))}
      </ul>
      {compact ? null : <p className="tiny">{brief.exploratoryRule}</p>}
    </section>
  );
}
