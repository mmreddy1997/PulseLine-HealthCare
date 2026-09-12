/**
 * Provisional PulseLine contracts.
 * These shapes will be adapted once a verified CMS extract is inspected.
 * Do not treat them as a final research schema.
 */

/** Six-digit CMS Certification Number, stored as a string so leading zeroes are preserved. */
export type CmsCcn = string;

export const IDENTITY_REVIEW_STATUSES = ["clear", "unresolved", "resolved"] as const;
export type IdentityReviewStatus = (typeof IDENTITY_REVIEW_STATUSES)[number];

export const OBSERVATION_CLASSIFICATIONS = ["observed", "simulated"] as const;
export type ObservationClassification = (typeof OBSERVATION_CLASSIFICATIONS)[number];

export const IDENTITY_DISCREPANCY_KINDS = [
  "name_mismatch",
  "ccn_conflict",
  "address_change",
  "other",
] as const;
export type IdentityDiscrepancyKind = (typeof IDENTITY_DISCREPANCY_KINDS)[number];

export interface HospitalIdentity {
  name: string;
  /** Always a six-digit string. Never coerce to a number. */
  ccn: CmsCcn;
  city: string;
  state: string;
  address: string;
  identityReviewStatus: IdentityReviewStatus;
}

export interface Provenance {
  source: string;
  retrievedAt: string | null;
  notes: string | null;
}

/**
 * Missing values stay null. A missing financial field is not zero
 * and must not be filled in during validation.
 */
export interface MissingDataNote {
  field: string;
  reason: string;
}

/**
 * Identity discrepancies are recorded as-is.
 * An address change is not evidence that a physician departed.
 */
export interface IdentityDiscrepancy {
  kind: IdentityDiscrepancyKind;
  description: string;
  resolved: boolean;
}

export interface CostReportObservation {
  hospital: HospitalIdentity;
  fiscalPeriodStart: string;
  fiscalPeriodEnd: string;
  /** Original source fields. Nulls and omitted financials are left untouched. */
  sourceFields: Record<string, unknown>;
  provenance: Provenance;
  classification: ObservationClassification;
  missingData: MissingDataNote[];
  identityDiscrepancies: IdentityDiscrepancy[];
}

export interface ValidationIssue {
  code: string;
  path: string;
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  /** Present only when there are no errors. Warnings may still be attached. */
  value?: CostReportObservation;
}

export interface BatchValidationResult {
  ok: boolean;
  results: ValidationResult[];
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

/** Nullable financial observation. Missing is null, never coerced to zero. */
export interface HospitalFinancials {
  netPatientRevenue: number | null;
  operatingRevenue: number | null;
  operatingExpenses: number | null;
  operatingIncome: number | null;
  operatingMargin: number | null;
  totalAssets: number | null;
  totalLiabilities: number | null;
  currentAssets: number | null;
  currentLiabilities: number | null;
  cash: number | null;
  inpatientDays: number | null;
  discharges: number | null;
  availableBeds: number | null;
  bedDaysAvailable: number | null;
  uncompensatedCare: number | null;
}

export interface AddressEvidence {
  role: "cms_cost_report" | "other_directory";
  address: string;
  source: string;
  retrievedAt: string | null;
  verification: "pending" | "supported";
}

export interface HospitalDataQuality {
  identityStatus: IdentityReviewStatus;
  missingFields: string[];
  warnings: string[];
  source: string;
  cmsCostReportAddress: string | null;
  otherDirectoryAddress: string | null;
  addressMismatch: boolean;
  addressEvidence: AddressEvidence[];
  sourceVerification: "pending" | "verified";
}

/**
 * Normalized hospital used by scoring and the dashboard.
 * Extends the validated cost-report observation; it does not replace it.
 */
export interface Hospital {
  id: string;
  hospitalId: string;
  ccn: CmsCcn;
  currentCcn: string | null;
  historicalCcn: string | null;
  ccnAsReported: string | null;
  name: string;
  city: string;
  state: string;
  zip: string | null;
  county: string | null;
  countyFips: string | null;
  ownershipCategory: string | null;
  ruralClassification: string | null;
  address: string | null;
  fiscalYearStart: string | null;
  fiscalYearEnd: string;
  reportRecordId: string | null;
  fileCohort: number | null;
  sourceId: string | null;
  sourceUrl: string | null;
  publicationDate?: string | null;
  reportingScope?: string | null;
  periodDays: number | null;
  financials: HospitalFinancials;
  dataQuality: HospitalDataQuality;
  /** PulseLine field → original CMS / HCRIS field name. */
  sourceFieldMap: Record<string, string>;
  sourceFields: Record<string, unknown>;
  metricDefinitions: Record<string, string>;
  identityDiscrepancies: IdentityDiscrepancy[];
  classification: ObservationClassification;
  provenance: Provenance;
  outcomeStatus: string;
}

export type WorkforceStatus = "not_available" | "simulated" | "real";

export interface WorkforceSignal {
  status: WorkforceStatus;
  summary: string;
  explanation: string;
}

export type FinancialStatus = "Stable" | "Watch" | "High Concern" | "Insufficient data";
export type DataCoverage = "None" | "Low" | "Moderate" | "High";
export type FactorAvailability = "available" | "unavailable" | "invalid" | "unsupported";

export interface ScoreFactor {
  id: string;
  metric: string;
  rawValue: number | null;
  formula: string;
  healthy: number;
  concern: number;
  direction: "lower_is_riskier" | "higher_is_riskier";
  normalizedRisk: number | null;
  baseWeight: number;
  effectiveWeight: number | null;
  weightedPoints: number | null;
  reason: string;
  source: string;
  available: boolean;
  availability: FactorAvailability;
  exclusion: string | null;
}

export interface ScoreReconstruction {
  availableFactorIds: string[];
  weightSum: number;
  unroundedScore: number | null;
  roundedScore: number | null;
  rounding: string;
  correlatedFactors: string[];
  coverageNote: string;
}

export interface FinancialDistressResult {
  score: number | null;
  status: FinancialStatus;
  dataCoverage: DataCoverage;
  factors: ScoreFactor[];
  missingInputs: string[];
  exclusions: string[];
  limitations: string[];
  reconstruction: ScoreReconstruction;
}

export type PulseSeverity = "not_triggered" | "insufficient_evidence" | "watch" | "high";

export interface PulseLineSignal {
  triggered: boolean;
  severity: PulseSeverity;
  reasons: string[];
  availableSignals: string[];
  missingSignals: string[];
  limitations: string[];
}

export interface HospitalView {
  hospital: Hospital;
  financial: FinancialDistressResult;
  workforce: WorkforceSignal;
  pulse: PulseLineSignal;
}

export interface FacilityRadarView {
  hospitalId: string;
  name: string;
  latest: HospitalView;
  reports: HospitalView[];
}

export const EVIDENCE_IDENTITY_STATUSES = [
  "existing_research_id",
  "internal_case_id_pending_CMS_crosswalk",
] as const;
export type EvidenceIdentityStatus = (typeof EVIDENCE_IDENTITY_STATUSES)[number];

export const PROVIDER_CHOW_STATES = ["unknown", "yes", "no"] as const;
export type ProviderChowState = (typeof PROVIDER_CHOW_STATES)[number];

export const DATE_PRECISIONS = ["day", "month", "year", "unknown"] as const;
export type DatePrecision = (typeof DATE_PRECISIONS)[number];

export const EVENT_CATEGORIES = [
  "acquisition",
  "property_transaction",
  "parent_bankruptcy",
  "parent_restructuring",
] as const;
export type EventCategory = (typeof EVENT_CATEGORIES)[number];

export const EVENT_STATUSES = ["verified", "verified_parent_event", "unverified", "unknown"] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export const EVENT_SCOPES = ["hospital", "property", "parent", "parent_and_named_debtors"] as const;
export type EventScope = (typeof EVENT_SCOPES)[number];

export const CONFIDENCE_LEVELS = ["high", "partial", "low"] as const;
export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number];

export const CUTOFF_STATES = ["not_assessed", "excluded_unknown_publication", "available", "unavailable"] as const;
export type CutoffState = (typeof CUTOFF_STATES)[number];

export const OBSERVATION_DOMAINS = [
  "community",
  "workforce_access",
  "operational",
  "financial",
  "structural",
] as const;
export type ObservationDomain = (typeof OBSERVATION_DOMAINS)[number];

export interface EvidenceSource {
  sourceId: string;
  url: string;
  title: string;
  publicationDate: string | null;
  publicationPrecision: DatePrecision | null;
  sourceType: string;
  accessDate: string;
  historicallyEligible: boolean;
  eligibilityNote: string;
}

export interface StructuralEvent {
  eventId: string;
  hospitalId: string;
  eventCategory: EventCategory;
  eventSubtype: string;
  eventStatus: EventStatus;
  effectiveDate: string | null;
  effectiveDatePrecision: DatePrecision;
  announcementDate: string | null;
  sources: EvidenceSource[];
  buyer: string | null;
  seller: string | null;
  scope: EventScope;
  eventConfidence: ConfidenceLevel;
  identityConfidence: ConfidenceLevel;
  verifiedOutcome: boolean;
  notes: string;
  ccnAtEvent: string | null;
  predictionCutoff: string | null;
  experimentalSignal: boolean;
  availableBeforeCutoff: CutoffState;
  eventGroup: string;
}

export interface EvidenceObservation {
  observationId: string;
  hospitalId: string;
  domain: ObservationDomain;
  metric: string;
  value: number | null;
  unit: string;
  reportingPeriod: string | null;
  scope: string;
  sources: EvidenceSource[];
  sourcePage: string | null;
  publicationDate: string | null;
  accessDate: string;
  identityConfidence: ConfidenceLevel;
  evidenceClass: string;
  extractionStatus: string;
  historicalFeatureEligible: boolean;
  limitations: string;
}

export interface EvidenceHospital {
  hospitalId: string;
  name: string;
  city: string;
  identityStatus: EvidenceIdentityStatus;
  ccnAtEvent: string | null;
  providerChow: ProviderChowState;
  financialCoverage: "available" | "pending";
}

export interface EvidenceLedger {
  hospitals: EvidenceHospital[];
  events: StructuralEvent[];
  observations: EvidenceObservation[];
  domainCoverage: Record<string, string>;
  openResearch: string[];
  rules: string[];
}
