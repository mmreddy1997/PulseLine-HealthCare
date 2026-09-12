import type { HospitalView } from "../../src/types.ts";
import { MEASURES, type MeasureId } from "./measures.ts";

export const PERIOD_DAY_TOLERANCE = 30;

export const EXPLORATORY_CHANGE_PCT = 10;
export const EXPLORATORY_CHANGE_RULE =
  "A 10 percentage-point display cue is an exploratory PulseLine rule. It is not a materiality, audit, credit, or valuation threshold.";

export interface ComparabilityCheck {
  id: string;
  ok: boolean;
  detail: string;
}

export interface ComparabilityResult {
  comparable: boolean;
  checks: ComparabilityCheck[];
  note: string;
}

function parseIso(value: string | null): number | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const time = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(time) ? time : null;
}

export function periodsOverlap(left: HospitalView, right: HospitalView): boolean {
  const leftStart = parseIso(left.hospital.fiscalYearStart) ?? parseIso(left.hospital.fiscalYearEnd);
  const rightStart = parseIso(right.hospital.fiscalYearStart) ?? parseIso(right.hospital.fiscalYearEnd);
  const leftEnd = parseIso(left.hospital.fiscalYearEnd);
  const rightEnd = parseIso(right.hospital.fiscalYearEnd);
  if (leftStart === null || rightStart === null || leftEnd === null || rightEnd === null) return false;
  return leftStart <= rightEnd && rightStart <= leftEnd;
}

export function orderedReports(reports: HospitalView[]): HospitalView[] {
  return [...reports].sort((left, right) => left.hospital.fiscalYearEnd.localeCompare(right.hospital.fiscalYearEnd));
}

export function compareTwoReports(current: HospitalView, previous: HospitalView, measureId?: MeasureId): ComparabilityResult {
  const checks: ComparabilityCheck[] = [];
  const measure = measureId ? MEASURES[measureId] : null;

  checks.push({
    id: "definition",
    ok: true,
    detail: measure
      ? `${measure.label} uses the same PulseLine definition on both reports.`
      : "Compared reports use the same PulseLine measure definitions.",
  });
  checks.push({
    id: "unit",
    ok: true,
    detail: measure ? `Unit is ${measure.unit} on both reports.` : "Compared figures keep their original units.",
  });

  const currentDays = current.hospital.periodDays;
  const previousDays = previous.hospital.periodDays;
  const durationOk =
    currentDays == null || previousDays == null || Math.abs(currentDays - previousDays) <= PERIOD_DAY_TOLERANCE;
  checks.push({
    id: "duration",
    ok: durationOk,
    detail: durationOk
      ? "Reporting-period lengths are within 30 days of each other."
      : "Reporting-period lengths differ by more than 30 days, so PulseLine does not treat these as a continuous trend.",
  });

  const currentScope = current.hospital.reportingScope ?? null;
  const previousScope = previous.hospital.reportingScope ?? null;
  const scopeKnown = Boolean(currentScope && previousScope);
  const scopeOk = !scopeKnown || currentScope === previousScope;
  checks.push({
    id: "entity_scope",
    ok: scopeOk,
    detail: !scopeKnown
      ? "Reporting-entity versus parent consolidation is not independently reconciled. Comparisons stay limited."
      : scopeOk
        ? `Both reports use the recorded scope “${currentScope}”.`
        : `Recorded scopes differ (“${previousScope}” vs “${currentScope}”).`,
  });

  const sameRecord =
    current.hospital.reportRecordId !== null && current.hospital.reportRecordId === previous.hospital.reportRecordId;
  const overlap = current.hospital.id !== previous.hospital.id && periodsOverlap(current, previous);
  checks.push({
    id: "overlap",
    ok: !sameRecord && !overlap,
    detail: sameRecord
      ? "These rows share a CMS report record id."
      : overlap
        ? "The fiscal periods overlap, so PulseLine does not present an unqualified growth rate."
        : "The fiscal periods do not overlap and are not the same CMS report record.",
  });

  const blocking = checks.filter((check) => !check.ok && check.id !== "entity_scope");
  const comparable = blocking.length === 0;
  const note = comparable
    ? scopeKnown && scopeOk
      ? "Lines connect successive fiscal reports that use the same CMS measure. A few reports are not a statistically established trend."
      : "Underlying figures can be shown. Entity scope is not independently reconciled, so PulseLine does not treat this as a confirmed same-entity trend."
    : blocking.map((check) => check.detail).join(" ");

  return { comparable, checks, note };
}

export function periodSetComparability(reports: HospitalView[]): ComparabilityResult {
  const ordered = orderedReports(reports);
  if (ordered.length < 2) {
    return {
      comparable: true,
      checks: [],
      note: "A single report is shown. PulseLine does not claim a trend from one observation.",
    };
  }
  const days = ordered.map((report) => report.hospital.periodDays).filter((value): value is number => value != null);
  if (days.length >= 2) {
    const spread = Math.max(...days) - Math.min(...days);
    if (spread > PERIOD_DAY_TOLERANCE) {
      return {
        comparable: false,
        checks: [
          {
            id: "duration",
            ok: false,
            detail: "Reporting-period lengths differ by more than 30 days, so PulseLine does not treat these as a continuous trend.",
          },
        ],
        note: "Reporting-period lengths differ by more than 30 days, so PulseLine does not treat these as a continuous trend.",
      };
    }
  }
  for (let index = 1; index < ordered.length; index += 1) {
    const pair = compareTwoReports(ordered[index], ordered[index - 1]);
    if (!pair.comparable) return pair;
  }
  const factorSets = ordered.map((report) => [...report.financial.reconstruction.availableFactorIds].sort().join(","));
  const factorShift = new Set(factorSets).size > 1;
  return {
    comparable: true,
    checks: [],
    note: factorShift
      ? "Available scoring factors differ across reports, so score history is not strictly comparable. A few reports are not a statistically established trend."
      : "Lines connect successive fiscal reports that use the same CMS measure. A few reports are not a statistically established trend.",
  };
}

export function safePercentChange(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || previous <= 0) return null;
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  return ((current - previous) / previous) * 100;
}

export function percentChangeNote(previousValue: number | null): string | null {
  if (previousValue === null) return "PulseLine does not calculate percentage growth when the earlier value is missing. Missing is not zero.";
  if (previousValue === 0) return "PulseLine does not calculate percentage growth from a zero baseline.";
  if (previousValue < 0) return "PulseLine does not calculate percentage growth from a negative baseline.";
  return null;
}

export function comparableChange(
  current: HospitalView,
  previous: HospitalView,
  currentValue: number | null,
  previousValue: number | null,
  measureId: MeasureId,
): { percent: number | null; comparable: boolean; note: string } {
  const comparability = compareTwoReports(current, previous, measureId);
  if (!comparability.comparable) {
    return { percent: null, comparable: false, note: comparability.note };
  }
  const percent = safePercentChange(currentValue, previousValue);
  if (percent === null) {
    return {
      percent: null,
      comparable: comparability.comparable,
      note: percentChangeNote(previousValue) ?? "PulseLine does not calculate a change when a comparable earlier value is missing or not a valid positive baseline.",
    };
  }
  return { percent, comparable: true, note: comparability.note };
}
