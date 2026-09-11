import { adaptResearchPack } from "./adapt-research.ts";
import { normalizeHospital, type HospitalExtractFile } from "./normalize-hospital.ts";
import { buildPulseLineSignal } from "./pulse-signal.ts";
import { rankHospitalViews, scoreFinancialDistress } from "./score-financial.ts";
import { validateHospitalExtract } from "./validate-extract.ts";
import { buildWorkforceSignal } from "./workforce.ts";
import type { FacilityRadarView, HospitalView, ValidationIssue } from "../src/types.ts";

export type { HospitalExtractFile } from "./normalize-hospital.ts";

export interface DashboardLoadResult {
  ok: boolean;
  views: HospitalView[];
  facilities: FacilityRadarView[];
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  sourceVerification: "pending" | "verified";
  missingEvidence: string[];
}

export function buildHospitalViews(extract: HospitalExtractFile): HospitalView[] {
  const workforce = buildWorkforceSignal();
  const views = extract.observations.map((record) => {
    const hospital = normalizeHospital(record);
    hospital.dataQuality.sourceVerification = extract.sourceVerification ?? "pending";
    const financial = scoreFinancialDistress(hospital);
    return {
      hospital,
      financial,
      workforce,
      pulse: buildPulseLineSignal(financial, workforce),
    };
  });
  return rankHospitalViews(views);
}

export function groupFacilities(views: HospitalView[]): FacilityRadarView[] {
  const groups = new Map<string, HospitalView[]>();
  for (const view of views) {
    const key = view.hospital.hospitalId;
    const list = groups.get(key) ?? [];
    list.push(view);
    groups.set(key, list);
  }
  const facilities: FacilityRadarView[] = [];
  for (const [hospitalId, reports] of groups) {
    const ordered = [...reports].sort((left, right) =>
      right.hospital.fiscalYearEnd.localeCompare(left.hospital.fiscalYearEnd),
    );
    const latest = ordered[0];
    if (!latest) continue;
    facilities.push({
      hospitalId,
      name: latest.hospital.name,
      latest,
      reports: ordered,
    });
  }
  return [...facilities].sort((left, right) => {
    const leftScore = left.latest.financial.score;
    const rightScore = right.latest.financial.score;
    if (leftScore === null && rightScore === null) return 0;
    if (leftScore === null) return 1;
    if (rightScore === null) return -1;
    return rightScore - leftScore;
  });
}

/** Validate the dashboard extract, then normalize and score. Invalid data fails closed. */
export function loadDashboardExtract(input: unknown): DashboardLoadResult {
  const validation = validateHospitalExtract(input);
  if (!validation.ok || !validation.value) {
    return {
      ok: false,
      views: [],
      facilities: [],
      errors: validation.errors,
      warnings: validation.warnings,
      sourceVerification: "pending",
      missingEvidence: [],
    };
  }
  const views = buildHospitalViews(validation.value);
  return {
    ok: true,
    views,
    facilities: groupFacilities(views),
    errors: validation.errors,
    warnings: validation.warnings,
    sourceVerification: validation.value.sourceVerification ?? "pending",
    missingEvidence: validation.value.missingEvidence ?? [],
  };
}

/** Research pack → adapter → extract validation → score. */
export function loadResearchDashboard(researchPack: unknown): DashboardLoadResult {
  const adapted = adaptResearchPack(researchPack);
  if (!adapted.ok || !adapted.extract) {
    return {
      ok: false,
      views: [],
      facilities: [],
      errors: adapted.errors,
      warnings: [],
      sourceVerification: "pending",
      missingEvidence: [],
    };
  }
  const loaded = loadDashboardExtract(adapted.extract);
  if (!loaded.ok) {
    return loaded;
  }
  return {
    ...loaded,
    errors: [...adapted.errors, ...loaded.errors],
  };
}
