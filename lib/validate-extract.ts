import {
  IDENTITY_DISCREPANCY_KINDS,
  IDENTITY_REVIEW_STATUSES,
  OBSERVATION_CLASSIFICATIONS,
  type ValidationIssue,
} from "../src/types.ts";
import type { HospitalExtractFile, HospitalExtractRecord } from "./normalize-hospital.ts";

const CCN_PATTERN = /^\d{6}$/;
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const KENTUCKY_STATES = new Set(["KY", "KENTUCKY"]);
const FINANCIAL_KEYS = [
  "netPatientRevenue",
  "operatingRevenue",
  "operatingExpenses",
  "operatingIncome",
  "operatingMargin",
  "totalAssets",
  "totalLiabilities",
  "currentAssets",
  "currentLiabilities",
  "cash",
  "inpatientDays",
  "discharges",
  "availableBeds",
  "bedDaysAvailable",
  "uncompensatedCare",
] as const;

function issue(code: string, path: string, message: string): ValidationIssue {
  return { code, path, message };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCalendarDate(value: string): boolean {
  const match = ISO_DATE_PATTERN.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utc = new Date(Date.UTC(year, month - 1, day));
  return utc.getUTCFullYear() === year && utc.getUTCMonth() === month - 1 && utc.getUTCDate() === day;
}

function requireString(errors: ValidationIssue[], value: unknown, path: string, label: string): void {
  if (typeof value !== "string" || value.trim() === "") {
    errors.push(issue("MISSING_REQUIRED_FIELD", path, `${label} is required.`));
  }
}

function validateNullableNumber(errors: ValidationIssue[], value: unknown, path: string, label: string): void {
  if (value === null || value === undefined) return;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    errors.push(
      issue("INVALID_TYPE", path, `${label} must be a finite number or null. Received ${typeof value}.`),
    );
  }
}

export interface ExtractValidationResult {
  ok: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  value?: HospitalExtractFile;
}

/**
 * Runtime validation for the dashboard extract.
 * Missing financials or provenance fail closed. Unknown fiscal starts may be null.
 */
export function validateHospitalExtract(input: unknown): ExtractValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  if (!isPlainObject(input)) {
    return {
      ok: false,
      errors: [issue("MALFORMED_INPUT", "$", "Dashboard extract must be an object.")],
      warnings,
    };
  }

  requireString(errors, input.disclaimer, "$.disclaimer", "Extract disclaimer");
  requireString(errors, input.source, "$.source", "Extract source");

  if (!Array.isArray(input.observations)) {
    errors.push(issue("MALFORMED_INPUT", "$.observations", "observations must be an array."));
    return { ok: false, errors, warnings };
  }

  if (input.observations.length === 0) {
    errors.push(issue("EMPTY_DATASET", "$.observations", "The dashboard extract contains no hospital records."));
    return { ok: false, errors, warnings };
  }

  const seenKeys = new Map<string, string>();
  const seenIds = new Map<string, string>();

  input.observations.forEach((item, index) => {
    const path = `$.observations[${index}]`;
    if (!isPlainObject(item)) {
      errors.push(issue("MALFORMED_INPUT", path, "Each observation must be an object."));
      return;
    }

    requireString(errors, item.id, `${path}.id`, "Record id");
    if (typeof item.id === "string" && item.id.trim() !== "") {
      const previousId = seenIds.get(item.id);
      if (previousId) {
        errors.push(issue("DUPLICATE_RECORD", path, `Duplicate record id "${item.id}" (also ${previousId}).`));
      } else {
        seenIds.set(item.id, path);
      }
    }
    requireString(errors, item.city, `${path}.city`, "City");
    if (item.hospitalId !== undefined && item.hospitalId !== null && typeof item.hospitalId !== "string") {
      errors.push(issue("INVALID_TYPE", `${path}.hospitalId`, "hospitalId must be a string when present."));
    }
    if (item.reportRecordId !== undefined && item.reportRecordId !== null && typeof item.reportRecordId !== "string") {
      errors.push(issue("INVALID_TYPE", `${path}.reportRecordId`, "reportRecordId must be a string or null."));
    }
    if (item.fileCohort !== undefined && item.fileCohort !== null) {
      if (typeof item.fileCohort !== "number" || !Number.isFinite(item.fileCohort)) {
        errors.push(issue("INVALID_TYPE", `${path}.fileCohort`, "fileCohort must be a finite number or null."));
      }
    }
    if (item.periodDays !== undefined && item.periodDays !== null) {
      if (typeof item.periodDays !== "number" || !Number.isFinite(item.periodDays)) {
        errors.push(issue("INVALID_TYPE", `${path}.periodDays`, "periodDays must be a finite number or null."));
      }
    }
    if (item.sourceUrl !== undefined && item.sourceUrl !== null && typeof item.sourceUrl !== "string") {
      errors.push(issue("INVALID_TYPE", `${path}.sourceUrl`, "sourceUrl must be a string or null."));
    }

    if (typeof item.ccn !== "string") {
      errors.push(issue("INVALID_CCN", `${path}.ccn`, "CMS CCN must be a six-digit string."));
    } else if (!CCN_PATTERN.test(item.ccn)) {
      errors.push(issue("INVALID_CCN", `${path}.ccn`, `CMS CCN must be exactly six digits. Received "${item.ccn}".`));
    }
    requireString(errors, item.name, `${path}.name`, "Hospital name");
    if (typeof item.state !== "string") {
      errors.push(issue("MISSING_REQUIRED_FIELD", `${path}.state`, "State is required."));
    } else if (!KENTUCKY_STATES.has(item.state.toUpperCase())) {
      errors.push(
        issue("OUT_OF_SCOPE_STATE", `${path}.state`, `PulseLine currently accepts Kentucky hospitals only. Received "${item.state}".`),
      );
    }

    if (!(IDENTITY_REVIEW_STATUSES as readonly string[]).includes(String(item.identityReviewStatus))) {
      errors.push(
        issue(
          "INVALID_ENUM",
          `${path}.identityReviewStatus`,
          `identityReviewStatus must be one of: ${IDENTITY_REVIEW_STATUSES.join(", ")}.`,
        ),
      );
    }
    if (!(OBSERVATION_CLASSIFICATIONS as readonly string[]).includes(String(item.classification))) {
      errors.push(
        issue(
          "INVALID_ENUM",
          `${path}.classification`,
          `classification must be one of: ${OBSERVATION_CLASSIFICATIONS.join(", ")}.`,
        ),
      );
    }

    let start: string | null = null;
    if (item.fiscalYearStart !== undefined && item.fiscalYearStart !== null) {
      if (typeof item.fiscalYearStart !== "string" || !isCalendarDate(item.fiscalYearStart)) {
        errors.push(
          issue(
            "INVALID_DATE",
            `${path}.fiscalYearStart`,
            "Fiscal year start must be a real YYYY-MM-DD date when provided. Unknown starts must remain null.",
          ),
        );
      } else {
        start = item.fiscalYearStart;
      }
    }
    if (typeof item.fiscalYearEnd !== "string" || !isCalendarDate(item.fiscalYearEnd)) {
      errors.push(
        issue("INVALID_DATE", `${path}.fiscalYearEnd`, "Fiscal year end must be a real calendar date in YYYY-MM-DD form."),
      );
    } else if (start && start > item.fiscalYearEnd) {
      errors.push(
        issue(
          "REVERSED_FISCAL_PERIOD",
          `${path}.fiscalYearStart`,
          `Fiscal start (${start}) is after fiscal end (${item.fiscalYearEnd}). Dates were not swapped.`,
        ),
      );
    }

    const ccn = typeof item.ccn === "string" ? item.ccn : "";
    const end = typeof item.fiscalYearEnd === "string" ? item.fiscalYearEnd : "";
    if (ccn && end) {
      const key = `${ccn}|${end}`;
      const previous = seenKeys.get(key);
      if (previous) {
        errors.push(
          issue("DUPLICATE_RECORD", path, `Duplicate hospital/report record for CCN ${ccn} and fiscal end ${end} (also ${previous}).`),
        );
      } else {
        seenKeys.set(key, path);
      }
    }

    if (item.provenance === undefined) {
      errors.push(issue("MISSING_REQUIRED_FIELD", `${path}.provenance`, "Provenance is required."));
    } else if (!isPlainObject(item.provenance)) {
      errors.push(issue("MALFORMED_INPUT", `${path}.provenance`, "Provenance must be an object."));
    } else {
      requireString(errors, item.provenance.source, `${path}.provenance.source`, "Provenance source");
      if (
        item.provenance.retrievedAt !== undefined &&
        item.provenance.retrievedAt !== null &&
        typeof item.provenance.retrievedAt !== "string"
      ) {
        errors.push(issue("INVALID_TYPE", `${path}.provenance.retrievedAt`, "retrievedAt must be a string or null."));
      }
      if (item.provenance.notes !== undefined && item.provenance.notes !== null && typeof item.provenance.notes !== "string") {
        errors.push(issue("INVALID_TYPE", `${path}.provenance.notes`, "notes must be a string or null."));
      }
    }

    if (item.financials === undefined) {
      errors.push(issue("MISSING_REQUIRED_FIELD", `${path}.financials`, "Financials are required. Missing values must be null, not omitted."));
    } else if (!isPlainObject(item.financials)) {
      errors.push(issue("MALFORMED_INPUT", `${path}.financials`, "financials must be an object."));
    } else {
      for (const key of FINANCIAL_KEYS) {
        if (!(key in item.financials)) {
          errors.push(
            issue("MISSING_REQUIRED_FIELD", `${path}.financials.${key}`, `${key} must be present as a number or null.`),
          );
        } else {
          validateNullableNumber(errors, item.financials[key], `${path}.financials.${key}`, key);
        }
      }
    }

    if (item.sourceFields === undefined) {
      errors.push(issue("MISSING_REQUIRED_FIELD", `${path}.sourceFields`, "sourceFields is required."));
    } else if (!isPlainObject(item.sourceFields)) {
      errors.push(issue("MALFORMED_INPUT", `${path}.sourceFields`, "sourceFields must be an object."));
    }

    if (item.sourceFieldMap === undefined) {
      errors.push(issue("MISSING_REQUIRED_FIELD", `${path}.sourceFieldMap`, "sourceFieldMap is required."));
    } else if (!isPlainObject(item.sourceFieldMap)) {
      errors.push(issue("MALFORMED_INPUT", `${path}.sourceFieldMap`, "sourceFieldMap must be an object."));
    }

    if (item.metricDefinitions !== undefined && !isPlainObject(item.metricDefinitions)) {
      errors.push(issue("MALFORMED_INPUT", `${path}.metricDefinitions`, "metricDefinitions must be an object when present."));
    }

    if (item.addressEvidence !== undefined) {
      if (!Array.isArray(item.addressEvidence)) {
        errors.push(issue("INVALID_TYPE", `${path}.addressEvidence`, "addressEvidence must be an array."));
      } else {
        item.addressEvidence.forEach((entry, evidenceIndex) => {
          const ePath = `${path}.addressEvidence[${evidenceIndex}]`;
          if (!isPlainObject(entry)) {
            errors.push(issue("MALFORMED_INPUT", ePath, "Each address evidence item must be an object."));
            return;
          }
          if (entry.role !== "cms_cost_report" && entry.role !== "other_directory") {
            errors.push(issue("INVALID_ENUM", `${ePath}.role`, 'role must be "cms_cost_report" or "other_directory".'));
          }
          requireString(errors, entry.address, `${ePath}.address`, "Address evidence address");
          requireString(errors, entry.source, `${ePath}.source`, "Address evidence source");
          if (entry.verification !== undefined && entry.verification !== "pending" && entry.verification !== "supported") {
            errors.push(issue("INVALID_ENUM", `${ePath}.verification`, 'verification must be "pending" or "supported".'));
          }
        });
      }
    }

    if (item.identityDiscrepancies !== undefined) {
      if (!Array.isArray(item.identityDiscrepancies)) {
        errors.push(issue("INVALID_TYPE", `${path}.identityDiscrepancies`, "identityDiscrepancies must be an array."));
      } else {
        item.identityDiscrepancies.forEach((entry, discrepancyIndex) => {
          const dPath = `${path}.identityDiscrepancies[${discrepancyIndex}]`;
          if (!isPlainObject(entry)) {
            errors.push(issue("MALFORMED_INPUT", dPath, "Each identity discrepancy must be an object."));
            return;
          }
          if (!(IDENTITY_DISCREPANCY_KINDS as readonly string[]).includes(String(entry.kind))) {
            errors.push(issue("INVALID_ENUM", `${dPath}.kind`, `kind must be one of: ${IDENTITY_DISCREPANCY_KINDS.join(", ")}.`));
          }
          requireString(errors, entry.description, `${dPath}.description`, "Discrepancy description");
          if (typeof entry.resolved !== "boolean") {
            errors.push(issue("INVALID_TYPE", `${dPath}.resolved`, "resolved must be a boolean."));
          }
        });
      }
    }
  });

  if (
    input.sourceVerification !== undefined &&
    input.sourceVerification !== "pending" &&
    input.sourceVerification !== "verified"
  ) {
    errors.push(
      issue("INVALID_ENUM", "$.sourceVerification", 'sourceVerification must be "pending" or "verified".'),
    );
  }
  if (input.retrievedAt !== undefined && input.retrievedAt !== null && typeof input.retrievedAt !== "string") {
    errors.push(issue("INVALID_TYPE", "$.retrievedAt", "retrievedAt must be a string or null."));
  }
  if (input.missingEvidence !== undefined && !Array.isArray(input.missingEvidence)) {
    errors.push(issue("INVALID_TYPE", "$.missingEvidence", "missingEvidence must be an array of strings."));
  }

  if (errors.length > 0) {
    return { ok: false, errors, warnings };
  }

  return {
    ok: true,
    errors,
    warnings,
    value: {
      disclaimer: String(input.disclaimer),
      source: String(input.source),
      retrievedAt: typeof input.retrievedAt === "string" ? input.retrievedAt : "",
      sourceVerification: input.sourceVerification === "verified" ? "verified" : "pending",
      missingEvidence: Array.isArray(input.missingEvidence)
        ? input.missingEvidence.filter((item): item is string => typeof item === "string")
        : [],
      observations: input.observations as HospitalExtractRecord[],
    },
  };
}
