import type {
  Hospital,
  HospitalFinancials,
  IdentityDiscrepancy,
  IdentityReviewStatus,
  ObservationClassification,
  Provenance,
} from "../src/types.ts";

export interface HospitalExtractRecord {
  id: string;
  ccn: string;
  name: string;
  city: string;
  state: string;
  zip?: string | null;
  county?: string | null;
  address?: string | null;
  fiscalYearStart?: string | null;
  fiscalYearEnd: string;
  identityReviewStatus: IdentityReviewStatus;
  classification: ObservationClassification;
  provenance: Provenance;
  sourceFieldMap: Record<string, string>;
  sourceFields: Record<string, unknown>;
  financials: HospitalFinancials;
  identityDiscrepancies?: IdentityDiscrepancy[];
  cmsCostReportAddress?: string | null;
  otherDirectoryAddress?: string | null;
  dataQualityWarnings?: string[];
}

function asNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return null;
}

function missingFinancialFields(financials: HospitalFinancials): string[] {
  const missing: string[] = [];
  for (const [key, value] of Object.entries(financials)) {
    if (value === null || value === undefined) missing.push(key);
  }
  return missing;
}

/**
 * Copy financials without converting missing values to zero.
 */
export function preserveFinancials(input: HospitalFinancials): HospitalFinancials {
  return {
    netPatientRevenue: asNullableNumber(input.netPatientRevenue),
    operatingRevenue: asNullableNumber(input.operatingRevenue),
    operatingExpenses: asNullableNumber(input.operatingExpenses),
    operatingIncome: asNullableNumber(input.operatingIncome),
    operatingMargin: asNullableNumber(input.operatingMargin),
    totalAssets: asNullableNumber(input.totalAssets),
    totalLiabilities: asNullableNumber(input.totalLiabilities),
    currentAssets: asNullableNumber(input.currentAssets),
    currentLiabilities: asNullableNumber(input.currentLiabilities),
    cash: asNullableNumber(input.cash),
    inpatientDays: asNullableNumber(input.inpatientDays),
    discharges: asNullableNumber(input.discharges),
    availableBeds: asNullableNumber(input.availableBeds),
    bedDaysAvailable: asNullableNumber(input.bedDaysAvailable),
    uncompensatedCare: asNullableNumber(input.uncompensatedCare),
  };
}

export function normalizeHospital(record: HospitalExtractRecord): Hospital {
  const financials = preserveFinancials(record.financials);
  const warnings = [...(record.dataQualityWarnings ?? [])];

  if (record.identityReviewStatus === "unresolved") {
    warnings.push("Identity verification required.");
  }
  if (record.cmsCostReportAddress && record.otherDirectoryAddress) {
    warnings.push("CMS cost-report address and another directory address do not match.");
  }
  if (financials.totalLiabilities !== null && financials.totalLiabilities < 0) {
    warnings.push("Published total liabilities are negative and were not repaired.");
  }

  return {
    id: record.id,
    ccn: record.ccn,
    name: record.name,
    city: record.city,
    state: record.state,
    zip: record.zip ?? null,
    county: record.county ?? null,
    address: record.address ?? record.cmsCostReportAddress ?? null,
    fiscalYearStart: record.fiscalYearStart ?? null,
    fiscalYearEnd: record.fiscalYearEnd,
    financials,
    dataQuality: {
      identityStatus: record.identityReviewStatus,
      missingFields: missingFinancialFields(financials),
      warnings,
      source: record.provenance.source,
      cmsCostReportAddress: record.cmsCostReportAddress ?? record.address ?? null,
      otherDirectoryAddress: record.otherDirectoryAddress ?? null,
    },
    sourceFieldMap: { ...record.sourceFieldMap },
    sourceFields: { ...record.sourceFields },
    identityDiscrepancies: record.identityDiscrepancies ?? [],
    classification: record.classification,
    provenance: record.provenance,
  };
}
