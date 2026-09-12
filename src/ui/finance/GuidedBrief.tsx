import type { HospitalView } from "../../types.ts";
import { guidedBrief } from "../../../lib/finance/index.ts";

export function GuidedBrief({ view, reports }: { view: HospitalView; reports: HospitalView[] }) {
  const brief = guidedBrief(view, reports);
  return (
    <section className="guided-brief" aria-labelledby="brief-title">
      <h3 id="brief-title">Guided financial brief</h3>
      <p className="tiny">Generated from the selected report and documented comparability rules. Not a model summary.</p>
      <h4>What the available records show</h4>
      <ul className="brief-list">
        {brief.records.map((line) => (
          <li key={line.id}>{line.text}</li>
        ))}
      </ul>
      <h4>What changed across comparable reports</h4>
      <ul className="brief-list">
        {brief.changes.map((line) => (
          <li key={line.id}>{line.text}</li>
        ))}
      </ul>
      <h4>What needs closer investigation</h4>
      <ul className="brief-list">
        {brief.investigate.map((line) => (
          <li key={line.id}>{line.text}</li>
        ))}
      </ul>
      <p className="tiny">{brief.exploratoryRule}</p>
    </section>
  );
}
