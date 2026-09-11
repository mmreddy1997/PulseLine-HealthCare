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
