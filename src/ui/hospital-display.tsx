import { parseCmsNumeric } from "../../lib/adapt-research.ts";
import type { FinancialStatus, Hospital, HospitalView, ScoreFactor } from "../types.ts";
import { percent, ratio, statusClass } from "./format.ts";

export function StatusGlyph({ status }: { status: FinancialStatus | "pending" }) {
  const label =
    status === "pending" ? "Financial data pending" : status === "Insufficient data" ? "Insufficient data" : status;
  return (
    <svg className="status-glyph" viewBox="0 0 16 16" aria-hidden="true" focusable="false" fill="currentColor">
      <title>{label}</title>
      {status === "High Concern" ? <path d="M8 2.2 L14.4 13.4 H1.6 Z" /> : null}
      {status === "Watch" ? <rect x="3.2" y="3.2" width="9.6" height="9.6" rx="1.2" transform="rotate(45 8 8)" /> : null}
      {status === "Stable" ? (
        <>
          <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M5 8.2 L7.1 10.2 L11.2 5.8" fill="none" stroke="currentColor" strokeWidth="1.6" />
        </>
      ) : null}
      {status === "Insufficient data" || status === "pending" ? (
        <circle cx="8" cy="8" r="5.2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeDasharray="2.4 2" />
      ) : null}
    </svg>
  );
}

export function patientServiceResultNote(hospital: Hospital): string {
  const income = parseCmsNumeric(hospital.sourceFields["Net Income from Service to Patients"], "income");
  const npr = hospital.financials.netPatientRevenue;
  if (income.error || income.value === null || npr === null) {
    return "Not calculated from this report.";
  }
  if (npr === 0) {
    return "Excluded: Net Patient Revenue is zero, so the patient-service result is not interpretable.";
  }
  return `${percent(income.value / npr)} = Net Income from Service to Patients / Net Patient Revenue. Historical patient-care result, not a validated overall operating margin.`;
}

export function factorDisplay(factor: ScoreFactor): string {
  if (factor.availability === "unavailable") return "Not available in current dataset";
  if (factor.availability === "invalid") return "Invalid in current dataset";
  if (factor.availability === "unsupported") return "Unsupported calculation";
  if (factor.rawValue === null) return "Not available in current dataset";
  if (factor.id === "operating_margin" || factor.id === "patient_volume") return percent(factor.rawValue);
  return ratio(factor.rawValue);
}

export function ScoreMeter({
  score,
  status,
}: {
  score: number | null;
  status: HospitalView["financial"]["status"];
}) {
  return (
    <div className={`score-meter ${statusClass(status)}`}>
      <div className="score-meter-value">{score === null ? "—" : score}</div>
      <div className="score-meter-scale">{score === null ? "no score" : "/ 100"}</div>
      <div className="score-meter-bar" aria-hidden="true">
        <span style={{ width: `${score ?? 0}%` }} />
      </div>
    </div>
  );
}
