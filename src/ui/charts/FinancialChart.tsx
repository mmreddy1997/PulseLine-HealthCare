import { shortFiscalRange } from "../format.ts";
import { money } from "../format.ts";
import type { ChartPoint, ChartSeries } from "../../../lib/charts/series.ts";

function formatValue(series: ChartSeries, value: number | null): string {
  if (value === null) return "Not available";
  if (series.unit === "usd") return money(value);
  if (series.unit === "percent") return `${(value * 100).toFixed(1)}%`;
  if (series.unit === "score") return String(Math.round(value));
  return value.toFixed(2);
}

export function FinancialChart({
  series,
  extra,
  compact = false,
}: {
  series: ChartSeries;
  extra?: ChartSeries | null;
  compact?: boolean;
}) {
  const rows = series.points;
  const values = [...rows, ...(extra?.points ?? [])]
    .map((point) => point.value)
    .filter((value): value is number => value !== null);
  const max = values.length ? Math.max(...values.map(Math.abs), 1) : 1;
  const height = compact ? 120 : 180;

  return (
    <figure className={`chart-block ${compact ? "is-compact" : ""}`}>
      <figcaption>
        <strong>{series.title}</strong>
        <p className="tiny">{series.question}</p>
      </figcaption>
      <svg className="chart-svg" viewBox={`0 0 640 ${height + 36}`} role="img" aria-labelledby={`${series.id}-title`}>
        <title id={`${series.id}-title`}>{series.title}</title>
        {rows.map((point, index) => {
          const pair = extra?.points[index];
          const x = 28 + index * (600 / Math.max(rows.length, 1));
          const width = Math.min(36, 480 / Math.max(rows.length, 1));
          return (
            <g key={point.reportId}>
              {bar(point, x, width, max, height, "chart-bar")}
              {pair ? bar(pair, x + width + 4, width, max, height, "chart-bar alt") : null}
              <text className="chart-tick" x={x + width} y={height + 24} textAnchor="middle">
                {shortFiscalRange(point.start, point.end).replace(" – ", "–")}
              </text>
            </g>
          );
        })}
        <line className="chart-axis" x1="16" x2="624" y1={height} y2={height} />
      </svg>
      <details>
        <summary>Data table</summary>
        <table className="chart-table">
          <thead>
            <tr>
              <th scope="col">Fiscal period</th>
              <th scope="col">{series.title}</th>
              {extra ? <th scope="col">{extra.title}</th> : null}
              <th scope="col">Notes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((point, index) => (
              <tr key={point.reportId}>
                <td>{shortFiscalRange(point.start, point.end)}</td>
                <td>{point.excluded ? "Excluded" : formatValue(series, point.value)}</td>
                {extra ? <td>{extra.points[index]?.excluded ? "Excluded" : formatValue(extra, extra.points[index]?.value ?? null)}</td> : null}
                <td>{point.exclusion ?? extra?.points[index]?.exclusion ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
      <details>
        <summary>How calculated</summary>
        <p className="tiny">{series.definition}</p>
        <p className="tiny">{series.comparabilityNote}</p>
        <p className="tiny">Zero baseline. Missing values are gaps, not zeros.</p>
      </details>
    </figure>
  );
}

function bar(point: ChartPoint, x: number, width: number, max: number, height: number, className: string) {
  if (point.value === null || point.excluded) {
    return (
      <rect
        className="chart-gap"
        x={x}
        y={height / 2 - 8}
        width={width}
        height={16}
      >
        <title>{point.exclusion ?? "Not available"}</title>
      </rect>
    );
  }
  const barHeight = Math.max(2, (Math.abs(point.value) / max) * (height - 16));
  const y = point.value < 0 ? height / 2 : height - barHeight;
  return (
    <rect
      className={className}
      x={x}
      y={y}
      width={width}
      height={point.value < 0 ? barHeight / 2 : barHeight}
      tabIndex={0}
      role="img"
      aria-label={`${shortFiscalRange(point.start, point.end)}: ${point.value}`}
    >
      <title>{`${shortFiscalRange(point.start, point.end)}: ${point.value}`}</title>
    </rect>
  );
}
