import type { HospitalView } from "../../src/types.ts";
import { comparableChange, EXPLORATORY_CHANGE_PCT, EXPLORATORY_CHANGE_RULE, orderedReports } from "./comparability.ts";
import { MEASURES, measureValue, patientServiceReconcile, type MeasureId } from "./measures.ts";
import { periodMeta } from "./period.ts";

export interface BriefLine {
  id: string;
  text: string;
  periodLabel: string | null;
}

export interface GuidedBrief {
  records: BriefLine[];
  changes: BriefLine[];
  investigate: BriefLine[];
  exploratoryRule: string;
}

function priorReport(reports: HospitalView[], current: HospitalView): HospitalView | null {
  return (
    orderedReports(reports)
      .filter((report) => report.hospital.fiscalYearEnd < current.hospital.fiscalYearEnd)
      .at(-1) ?? null
  );
}

function periodLabel(view: HospitalView): string {
  const start = view.hospital.fiscalYearStart;
  return start ? `${start} to ${view.hospital.fiscalYearEnd}` : `Ending ${view.hospital.fiscalYearEnd}`;
}

function moneyPhrase(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)} million`;
  return `${sign}$${Math.round(abs).toLocaleString("en-US")}`;
}

function changeLine(
  current: HospitalView,
  previous: HospitalView,
  id: MeasureId,
): BriefLine | null {
  const now = measureValue(current, id);
  const then = measureValue(previous, id);
  const change = comparableChange(current, previous, now.value, then.value, id);
  const label = MEASURES[id].label;
  if (now.value === null || then.value === null) {
    return {
      id: `missing:${id}`,
      text: `${label} cannot be compared because a value is missing. Missing is not zero.`,
      periodLabel: periodLabel(current),
    };
  }
  if (!change.comparable || change.percent === null) {
    return {
      id: `limited:${id}`,
      text: `${label} was ${moneyOrRatio(id, then.value)} in ${periodLabel(previous)} and ${moneyOrRatio(id, now.value)} in ${periodLabel(current)}. ${change.note}`,
      periodLabel: periodLabel(current),
    };
  }
  const cue =
    Math.abs(change.percent) >= EXPLORATORY_CHANGE_PCT
      ? ` The ${change.percent >= 0 ? "increase" : "decrease"} meets PulseLine’s exploratory ${EXPLORATORY_CHANGE_PCT}% display cue.`
      : "";
  return {
    id: `change:${id}`,
    text: `${label} changed ${change.percent.toFixed(1)}% from ${moneyOrRatio(id, then.value)} in ${periodLabel(previous)} to ${moneyOrRatio(id, now.value)} in ${periodLabel(current)}.${cue}`,
    periodLabel: periodLabel(current),
  };
}

function moneyOrRatio(id: MeasureId, value: number): string {
  const unit = MEASURES[id].unit;
  if (unit === "usd") return moneyPhrase(value);
  if (unit === "percent") return `${(value * 100).toFixed(1)}%`;
  if (unit === "ratio") return value.toFixed(2);
  return value.toLocaleString("en-US");
}

export function guidedBrief(view: HospitalView, reports: HospitalView[], asOf = new Date()): GuidedBrief {
  const period = periodMeta(view, asOf);
  const npr = measureValue(view, "net_patient_revenue");
  const expenses = measureValue(view, "patient_service_expenses");
  const cash = measureValue(view, "cash");
  const reconcile = patientServiceReconcile(view.hospital);
  const records: BriefLine[] = [
    {
      id: "period",
      text: `Selected fiscal period ${period.start ? `${period.start} to ${period.end}` : `ending ${period.end}`}. ${period.historicalNote}`,
      periodLabel: periodLabel(view),
    },
  ];
  if (npr.value !== null) {
    records.push({
      id: "npr",
      text: `Net patient revenue was ${moneyPhrase(npr.value)}. That is CMS Net Patient Revenue, not total hospital revenue.`,
      periodLabel: periodLabel(view),
    });
  } else {
    records.push({
      id: "npr_missing",
      text: "Net patient revenue is missing in this report. Missing is not zero.",
      periodLabel: periodLabel(view),
    });
  }
  if (expenses.value !== null) {
    records.push({
      id: "expenses",
      text: `Patient-service expenses were ${moneyPhrase(expenses.value)} (CMS Less Total Operating Expense).`,
      periodLabel: periodLabel(view),
    });
  }
  if (reconcile.published !== null && reconcile.derived !== null) {
    records.push({
      id: "result",
      text: reconcile.reconciled
        ? `The published patient-service result was ${moneyPhrase(reconcile.published)}, matching the derived balance.`
        : `Published patient-service result ${moneyPhrase(reconcile.published)} differs from the derived balance ${moneyPhrase(reconcile.derived)}. Both are shown.`,
      periodLabel: periodLabel(view),
    });
  }
  if (cash.value !== null) {
    records.push({
      id: "cash",
      text: `Cash on hand was ${moneyPhrase(cash.value)}. Negative published cash is preserved.`,
      periodLabel: periodLabel(view),
    });
  }

  const previous = priorReport(reports, view);
  const changes: BriefLine[] = [];
  if (!previous) {
    changes.push({
      id: "no_prior",
      text: "No earlier fiscal report is available for a comparison.",
      periodLabel: periodLabel(view),
    });
  } else {
    for (const id of ["net_patient_revenue", "patient_service_expenses", "cash"] as const) {
      const line = changeLine(view, previous, id);
      if (line) changes.push(line);
    }
  }

  const investigate: BriefLine[] = [
    {
      id: "publication",
      text: period.publicationLabel,
      periodLabel: periodLabel(view),
    },
    {
      id: "scope",
      text: "Reporting-entity versus parent consolidation is not independently reconciled.",
      periodLabel: periodLabel(view),
    },
  ];
  if (view.hospital.dataQuality.addressMismatch) {
    investigate.push({
      id: "address",
      text: "A street-address discrepancy is recorded and is not a workforce finding.",
      periodLabel: periodLabel(view),
    });
  }
  if (view.hospital.historicalCcn && view.hospital.currentCcn && view.hospital.historicalCcn !== view.hospital.currentCcn) {
    investigate.push({
      id: "ccn",
      text: `Reported CCN ${view.hospital.historicalCcn} differs from current CCN ${view.hospital.currentCcn}.`,
      periodLabel: periodLabel(view),
    });
  }
  if (!reconcile.reconciled && reconcile.published !== null && reconcile.derived !== null) {
    investigate.push({
      id: "reconcile",
      text: reconcile.note,
      periodLabel: periodLabel(view),
    });
  }

  return { records, changes, investigate, exploratoryRule: EXPLORATORY_CHANGE_RULE };
}
