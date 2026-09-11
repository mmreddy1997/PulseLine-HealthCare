import { addressesDiffer } from "./addresses.ts";
import type {
  AddressEvidence,
  Hospital,
  HospitalFinancials,
  IdentityDiscrepancy,
  IdentityReviewStatus,
  ObservationClassification,
  Provenance,
} from "../src/types.ts";

export interface HospitalExtractRecord {
  id: string;
  hospitalId?: string;
  ccn: string;
  currentCcn?: string | null;
  historicalCcn?: string | null;
  ccnAsReported?: string | null;
  name: string;
  city: string;
  state: string;
  zip?: string | null;
  county?: string | null;
  address?: string | null;
  fiscalYearStart?: string | null;
  fiscalYearEnd: string;
  reportRecordId?: string | null;
  fileCohort?: number | null;
  sourceId?: string | null;
  sourceUrl?: string | null;
  periodDays?: number | null;
  identityReviewStatus: IdentityReviewStatus;
  classification: ObservationClassification;
  provenance: Provenance;
  sourceFieldMap: Record<string, string>;
  sourceFields: Record<string, unknown>;
  financials: HospitalFinancials;
  metricDefinitions?: Record<string, string>;
  outcomeStatus?: string;
  identityDiscrepancies?: IdentityDiscrepancy[];
  cmsCostReportAddress?: string | null;
  otherDirectoryAddress?: string | null;
  addressEvidence?: AddressEvidence[];
  dataQualityWarnings?: string[];
}

export interface HospitalExtractFile {
  disclaimer: string;
  source: string;
  retrievedAt: string;
  sourceVerification?: "pending" | "verified";
  missingEvidence?: string[];
  observations: HospitalExtractRecord[];
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

  const addressMismatch = addressesDiffer(record.cmsCostReportAddress, record.otherDirectoryAddress);

  if (record.identityReviewStatus === "unresolved") {
    warnings.push("Identity verification required.");
  }
  if (addressMismatch) {
    warnings.push("CMS cost-report address and another directory address do not match.");
  }
  if (financials.totalLiabilities !== null && financials.totalLiabilities < 0) {
    warnings.push("Published total liabilities are negative and were not repaired.");
  }

  return {
    id: record.id,
    hospitalId: record.hospitalId ?? record.id,
    ccn: record.ccn,
    currentCcn: record.currentCcn ?? null,
    historicalCcn: record.historicalCcn ?? null,
    ccnAsReported: record.ccnAsReported ?? record.ccn,
    name: record.name,
    city: record.city,
    state: record.state,
    zip: record.zip ?? null,
    county: record.county ?? null,
    address: record.address ?? record.cmsCostReportAddress ?? null,
    fiscalYearStart: record.fiscalYearStart ?? null,
    fiscalYearEnd: record.fiscalYearEnd,
    reportRecordId: record.reportRecordId ?? null,
    fileCohort: record.fileCohort ?? null,
    sourceId: record.sourceId ?? null,
    sourceUrl: record.sourceUrl ?? null,
    periodDays: record.periodDays ?? null,
    financials,
    dataQuality: {
      identityStatus: record.identityReviewStatus,
      missingFields: missingFinancialFields(financials),
      warnings,
      source: record.provenance.source,
      cmsCostReportAddress: record.cmsCostReportAddress ?? null,
      otherDirectoryAddress: record.otherDirectoryAddress ?? null,
      addressMismatch,
      addressEvidence: record.addressEvidence ?? [],
      sourceVerification: "pending",
    },
    sourceFieldMap: { ...record.sourceFieldMap },
    sourceFields: { ...record.sourceFields },
    metricDefinitions: { ...(record.metricDefinitions ?? {}) },
    identityDiscrepancies: record.identityDiscrepancies ?? [],
    classification: record.classification,
    provenance: record.provenance,
    outcomeStatus: record.outcomeStatus ?? "Not systematically verified. Null does not mean no event.",
  };
}
