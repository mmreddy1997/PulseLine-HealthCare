import {
  IDENTITY_DISCREPANCY_KINDS,
  IDENTITY_REVIEW_STATUSES,
  OBSERVATION_CLASSIFICATIONS,
  type BatchValidationResult,
  type CostReportObservation,
  type HospitalIdentity,
  type IdentityDiscrepancy,
  type IdentityDiscrepancyKind,
  type IdentityReviewStatus,
  type MissingDataNote,
  type ObservationClassification,
  type Provenance,
  type ValidationIssue,
  type ValidationResult,
} from "./types.ts";

const CCN_PATTERN = /^\d{6}$/;
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const KENTUCKY_STATES = new Set(["KY", "KENTUCKY"]);

function issue(code: string, path: string, message: string): ValidationIssue {
  return { code, path, message };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isIdentityReviewStatus(value: unknown): value is IdentityReviewStatus {
  return (
    typeof value === "string" &&
    (IDENTITY_REVIEW_STATUSES as readonly string[]).includes(value)
  );
}

function isClassification(value: unknown): value is ObservationClassification {
  return (
    typeof value === "string" &&
    (OBSERVATION_CLASSIFICATIONS as readonly string[]).includes(value)
  );
}

function isDiscrepancyKind(value: unknown): value is IdentityDiscrepancyKind {
  return (
    typeof value === "string" &&
    (IDENTITY_DISCREPANCY_KINDS as readonly string[]).includes(value)
  );
}

function requireString(
  errors: ValidationIssue[],
  value: unknown,
  path: string,
  fieldLabel: string,
): string | undefined {
  if (value === undefined) {
    errors.push(issue("MISSING_REQUIRED_FIELD", path, `${fieldLabel} is required.`));
    return undefined;
  }
  if (typeof value !== "string") {
    errors.push(
      issue(
        "INVALID_TYPE",
        path,
        `${fieldLabel} must be a string. Received ${describeType(value)}. Value was not coerced.`,
      ),
    );
    return undefined;
  }
  if (value.trim() === "") {
    errors.push(issue("MISSING_REQUIRED_FIELD", path, `${fieldLabel} must not be empty.`));
    return undefined;
  }
  return value;
}

function describeType(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function parseCalendarDate(
  errors: ValidationIssue[],
  value: unknown,
  path: string,
  fieldLabel: string,
): string | undefined {
  const text = requireString(errors, value, path, fieldLabel);
  if (text === undefined) return undefined;

  const match = ISO_DATE_PATTERN.exec(text);
  if (!match) {
    errors.push(
      issue(
        "INVALID_DATE",
        path,
        `${fieldLabel} must be a calendar date in YYYY-MM-DD form. Received "${text}".`,
      ),
    );
    return undefined;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utc = new Date(Date.UTC(year, month - 1, day));
  const valid =
    utc.getUTCFullYear() === year &&
    utc.getUTCMonth() === month - 1 &&
    utc.getUTCDate() === day;

  if (!valid) {
    errors.push(
      issue(
        "INVALID_DATE",
        path,
        `${fieldLabel} is not a real calendar date: "${text}". The value was not adjusted.`,
      ),
    );
    return undefined;
  }

  return text;
}

function parseCcn(errors: ValidationIssue[], value: unknown, path: string): string | undefined {
  if (value === undefined) {
    errors.push(issue("MISSING_REQUIRED_FIELD", path, "CMS CCN is required."));
    return undefined;
  }
  if (typeof value !== "string") {
    errors.push(
      issue(
        "INVALID_CCN",
        path,
        `CMS CCN must be a six-digit string so leading zeroes are preserved. Received ${describeType(value)}. The value was not coerced.`,
      ),
    );
    return undefined;
  }
  if (!CCN_PATTERN.test(value)) {
    errors.push(
      issue(
        "INVALID_CCN",
        path,
        `CMS CCN must be exactly six digits. Received "${value}". The value was not padded or trimmed.`,
      ),
    );
    return undefined;
  }
  return value;
}

function parseKentuckyState(
  errors: ValidationIssue[],
  value: unknown,
  path: string,
): string | undefined {
  const text = requireString(errors, value, path, "State");
  if (text === undefined) return undefined;
  if (!KENTUCKY_STATES.has(text.toUpperCase())) {
    errors.push(
      issue(
        "OUT_OF_SCOPE_STATE",
        path,
        `PulseLine currently accepts Kentucky hospitals only (KY or Kentucky). Received "${text}".`,
      ),
    );
    return undefined;
  }
  return text;
}

function parseHospital(
  errors: ValidationIssue[],
  warnings: ValidationIssue[],
  value: unknown,
  path: string,
): HospitalIdentity | undefined {
  if (value === undefined) {
    errors.push(issue("MISSING_REQUIRED_FIELD", path, "Hospital identity is required."));
    return undefined;
  }
  if (!isPlainObject(value)) {
    errors.push(issue("MALFORMED_INPUT", path, "Hospital identity must be an object."));
    return undefined;
  }

  const name = requireString(errors, value.name, `${path}.name`, "Hospital name");
  const ccn = parseCcn(errors, value.ccn, `${path}.ccn`);
  const city = requireString(errors, value.city, `${path}.city`, "City");
  const state = parseKentuckyState(errors, value.state, `${path}.state`);
  const address = requireString(errors, value.address, `${path}.address`, "Address");

  let identityReviewStatus: IdentityReviewStatus | undefined;
  if (value.identityReviewStatus === undefined) {
    errors.push(
      issue(
        "MISSING_REQUIRED_FIELD",
        `${path}.identityReviewStatus`,
        "Identity-review status is required.",
      ),
    );
  } else if (!isIdentityReviewStatus(value.identityReviewStatus)) {
    errors.push(
      issue(
        "INVALID_ENUM",
        `${path}.identityReviewStatus`,
        `Identity-review status must be one of: ${IDENTITY_REVIEW_STATUSES.join(", ")}.`,
      ),
    );
  } else {
    identityReviewStatus = value.identityReviewStatus;
    if (identityReviewStatus === "unresolved") {
      warnings.push(
        issue(
          "UNRESOLVED_IDENTITY_REVIEW",
          `${path}.identityReviewStatus`,
          "Identity review is unresolved. The record was not rejected, but it needs human review before it is treated as a stable identity.",
        ),
      );
    }
  }

  if (
    name === undefined ||
    ccn === undefined ||
    city === undefined ||
    state === undefined ||
    address === undefined ||
    identityReviewStatus === undefined
  ) {
    return undefined;
  }

  return { name, ccn, city, state, address, identityReviewStatus };
}

function parseProvenance(
  errors: ValidationIssue[],
  value: unknown,
  path: string,
): Provenance | undefined {
  if (value === undefined) {
    errors.push(issue("MISSING_REQUIRED_FIELD", path, "Provenance is required."));
    return undefined;
  }
  if (!isPlainObject(value)) {
    errors.push(issue("MALFORMED_INPUT", path, "Provenance must be an object."));
    return undefined;
  }

  const source = requireString(errors, value.source, `${path}.source`, "Provenance source");
  if (source === undefined) return undefined;

  if (value.retrievedAt !== undefined && value.retrievedAt !== null && typeof value.retrievedAt !== "string") {
    errors.push(
      issue(
        "INVALID_TYPE",
        `${path}.retrievedAt`,
        `retrievedAt must be a string or null. Received ${describeType(value.retrievedAt)}.`,
      ),
    );
    return undefined;
  }
  if (value.notes !== undefined && value.notes !== null && typeof value.notes !== "string") {
    errors.push(
      issue(
        "INVALID_TYPE",
        `${path}.notes`,
        `notes must be a string or null. Received ${describeType(value.notes)}.`,
      ),
    );
    return undefined;
  }

  return {
    source,
    retrievedAt: value.retrievedAt === undefined ? null : value.retrievedAt,
    notes: value.notes === undefined ? null : value.notes,
  };
}

function parseMissingData(
  errors: ValidationIssue[],
  value: unknown,
  path: string,
): MissingDataNote[] | undefined {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    errors.push(issue("INVALID_TYPE", path, "missingData must be an array when provided."));
    return undefined;
  }

  const notes: MissingDataNote[] = [];
  for (let i = 0; i < value.length; i += 1) {
    const item = value[i];
    const itemPath = `${path}[${i}]`;
    if (!isPlainObject(item)) {
      errors.push(issue("MALFORMED_INPUT", itemPath, "Each missing-data note must be an object."));
      continue;
    }
    const field = requireString(errors, item.field, `${itemPath}.field`, "Missing-data field");
    const reason = requireString(errors, item.reason, `${itemPath}.reason`, "Missing-data reason");
    if (field !== undefined && reason !== undefined) {
      notes.push({ field, reason });
    }
  }
  return notes;
}

function claimsPhysicianDepartureFromAddress(item: Record<string, unknown>): boolean {
  if (item.physicianDeparture === true) return true;
  if (item.kind === "physician_departure") return true;
  if (item.kind === "address_change") {
    const description = typeof item.description === "string" ? item.description.toLowerCase() : "";
    return description.includes("physician") && description.includes("depart");
  }
  return false;
}

function parseIdentityDiscrepancies(
  errors: ValidationIssue[],
  warnings: ValidationIssue[],
  value: unknown,
  path: string,
): IdentityDiscrepancy[] | undefined {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    errors.push(
      issue("INVALID_TYPE", path, "identityDiscrepancies must be an array when provided."),
    );
    return undefined;
  }

  const discrepancies: IdentityDiscrepancy[] = [];
  for (let i = 0; i < value.length; i += 1) {
    const item = value[i];
    const itemPath = `${path}[${i}]`;
    if (!isPlainObject(item)) {
      errors.push(issue("MALFORMED_INPUT", itemPath, "Each identity discrepancy must be an object."));
      continue;
    }

    if (!isDiscrepancyKind(item.kind)) {
      errors.push(
        issue(
          "INVALID_ENUM",
          `${itemPath}.kind`,
          `Identity discrepancy kind must be one of: ${IDENTITY_DISCREPANCY_KINDS.join(", ")}.`,
        ),
      );
      continue;
    }

    const description = requireString(
      errors,
      item.description,
      `${itemPath}.description`,
      "Identity discrepancy description",
    );
    if (item.resolved === undefined) {
      errors.push(
        issue("MISSING_REQUIRED_FIELD", `${itemPath}.resolved`, "resolved is required on each identity discrepancy."),
      );
      continue;
    }
    if (typeof item.resolved !== "boolean") {
      errors.push(
        issue(
          "INVALID_TYPE",
          `${itemPath}.resolved`,
          `resolved must be a boolean. Received ${describeType(item.resolved)}.`,
        ),
      );
      continue;
    }

    if (claimsPhysicianDepartureFromAddress(item)) {
      warnings.push(
        issue(
          "ADDRESS_CHANGE_NOT_PHYSICIAN_DEPARTURE",
          itemPath,
          "A provider address change does not prove a physician departure. PulseLine records the identity discrepancy only and does not infer staffing loss.",
        ),
      );
    }

    if (!item.resolved) {
      warnings.push(
        issue(
          "UNRESOLVED_IDENTITY_DISCREPANCY",
          itemPath,
          "An identity discrepancy is unresolved and needs review. The record was not auto-corrected.",
        ),
      );
    }

    if (description !== undefined) {
      discrepancies.push({
        kind: item.kind,
        description,
        resolved: item.resolved,
      });
    }
  }

  return discrepancies;
}

function parseSourceFields(
  errors: ValidationIssue[],
  value: unknown,
  path: string,
): Record<string, unknown> | undefined {
  if (value === undefined) {
    errors.push(issue("MISSING_REQUIRED_FIELD", path, "sourceFields is required."));
    return undefined;
  }
  if (!isPlainObject(value)) {
    errors.push(issue("MALFORMED_INPUT", path, "sourceFields must be an object of original source values."));
    return undefined;
  }

  const preserved: Record<string, unknown> = {};
  for (const [key, fieldValue] of Object.entries(value)) {
    if (fieldValue === 0) {
      // Zero is a legal observed value. Missing values must arrive as null, not 0.
      preserved[key] = 0;
      continue;
    }
    if (fieldValue === undefined) {
      continue;
    }
    preserved[key] = fieldValue;
  }
  return preserved;
}

function parseClassification(
  errors: ValidationIssue[],
  value: unknown,
  path: string,
): ObservationClassification | undefined {
  if (value === undefined) {
    errors.push(issue("MISSING_REQUIRED_FIELD", path, "classification is required."));
    return undefined;
  }
  if (!isClassification(value)) {
    errors.push(
      issue(
        "INVALID_ENUM",
        path,
        `classification must be "observed" or "simulated". Received ${JSON.stringify(value)}.`,
      ),
    );
    return undefined;
  }
  return value;
}

/**
 * Validate a single unknown cost-report payload.
 * Invalid values are rejected; they are never silently repaired.
 */
export function validateCostReportObservation(
  input: unknown,
  path = "$",
): ValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  if (!isPlainObject(input)) {
    return {
      ok: false,
      errors: [issue("MALFORMED_INPUT", path, "Expected a cost-report observation object.")],
      warnings,
    };
  }

  const hospital = parseHospital(errors, warnings, input.hospital, `${path}.hospital`);
  const fiscalPeriodStart = parseCalendarDate(
    errors,
    input.fiscalPeriodStart,
    `${path}.fiscalPeriodStart`,
    "Fiscal period start",
  );
  const fiscalPeriodEnd = parseCalendarDate(
    errors,
    input.fiscalPeriodEnd,
    `${path}.fiscalPeriodEnd`,
    "Fiscal period end",
  );

  if (fiscalPeriodStart && fiscalPeriodEnd && fiscalPeriodStart > fiscalPeriodEnd) {
    errors.push(
      issue(
        "REVERSED_FISCAL_PERIOD",
        `${path}.fiscalPeriodStart`,
        `Fiscal period start (${fiscalPeriodStart}) is after fiscal period end (${fiscalPeriodEnd}). Dates were not swapped.`,
      ),
    );
  }

  const sourceFields = parseSourceFields(errors, input.sourceFields, `${path}.sourceFields`);
  const provenance = parseProvenance(errors, input.provenance, `${path}.provenance`);
  const classification = parseClassification(errors, input.classification, `${path}.classification`);
  const missingData = parseMissingData(errors, input.missingData, `${path}.missingData`);
  const identityDiscrepancies = parseIdentityDiscrepancies(
    errors,
    warnings,
    input.identityDiscrepancies,
    `${path}.identityDiscrepancies`,
  );

  if (errors.length > 0) {
    return { ok: false, errors, warnings };
  }

  const value: CostReportObservation = {
    hospital: hospital as HospitalIdentity,
    fiscalPeriodStart: fiscalPeriodStart as string,
    fiscalPeriodEnd: fiscalPeriodEnd as string,
    sourceFields: sourceFields as Record<string, unknown>,
    provenance: provenance as Provenance,
    classification: classification as ObservationClassification,
    missingData: missingData as MissingDataNote[],
    identityDiscrepancies: identityDiscrepancies as IdentityDiscrepancy[],
  };

  return { ok: true, errors, warnings, value };
}

function extractObservationList(input: unknown): { items: unknown[]; basePath: (index: number) => string } {
  if (Array.isArray(input)) {
    return { items: input, basePath: (index) => `$[${index}]` };
  }
  if (isPlainObject(input) && Array.isArray(input.observations)) {
    return { items: input.observations, basePath: (index) => `$.observations[${index}]` };
  }
  return { items: [input], basePath: () => "$" };
}

/** Validate a single observation, an array, or `{ observations: [...] }`. */
export function validateCostReportPayload(input: unknown): BatchValidationResult {
  const { items, basePath } = extractObservationList(input);
  const results = items.map((item, index) => validateCostReportObservation(item, basePath(index)));
  return {
    ok: results.every((result) => result.ok),
    results,
    errors: results.flatMap((result) => result.errors),
    warnings: results.flatMap((result) => result.warnings),
  };
}
