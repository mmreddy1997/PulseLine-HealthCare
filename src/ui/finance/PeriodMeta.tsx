import type { HospitalView } from "../../types.ts";
import { periodMeta } from "../../../lib/finance/index.ts";
import { fiscalLabel } from "../format.ts";

export function PeriodMeta({ view }: { view: HospitalView }) {
  const meta = periodMeta(view);
  return (
    <div className="period-meta">
      <p>
        <span className="label">Selected fiscal period</span>
        {fiscalLabel(meta.start, meta.end)}
        {meta.periodDays != null ? ` · ${meta.periodDays} days` : ""}
      </p>
      <p className="tiny">{meta.ageLabel}</p>
      <p className="tiny">{meta.publicationLabel}</p>
      {meta.fileCohort != null ? (
        <p className="tiny">CMS file cohort {meta.fileCohort} is a download year, not the fiscal period.</p>
      ) : null}
      <p className="tiny">{meta.historicalNote}</p>
    </div>
  );
}
