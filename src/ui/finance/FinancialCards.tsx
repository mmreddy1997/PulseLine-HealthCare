import type { HospitalView } from "../../types.ts";
import { dashboardCardIds, MEASURES, measureValue } from "../../../lib/finance/index.ts";
import { money, percent, ratio } from "../format.ts";

function formatCard(unit: (typeof MEASURES)[keyof typeof MEASURES]["unit"], value: number | null): string {
  if (value === null) return "Not available";
  if (unit === "usd") return money(value);
  if (unit === "percent") return percent(value);
  if (unit === "ratio") return ratio(value);
  return value.toLocaleString("en-US");
}

export function FinancialCards({ view }: { view: HospitalView }) {
  return (
    <div className="metric-grid">
      {dashboardCardIds(view).map((id) => {
        const definition = MEASURES[id];
        const cell = measureValue(view, id);
        return (
          <article key={id}>
            <span className="label">{definition.label}</span>
            <strong>{cell.excluded ? "Excluded" : formatCard(definition.unit, cell.value)}</strong>
            <p className="tiny">
              {definition.origin === "calculated" ? "Calculated" : "Source-reported"} · {definition.unit === "usd" ? "USD" : definition.unit}
            </p>
            <p className="tiny">{cell.exclusion ?? definition.not}</p>
          </article>
        );
      })}
    </div>
  );
}
