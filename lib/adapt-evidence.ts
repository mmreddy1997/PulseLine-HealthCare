import {
  CONFIDENCE_LEVELS,
  CUTOFF_STATES,
  DATE_PRECISIONS,
  EVENT_CATEGORIES,
  EVENT_SCOPES,
  EVENT_STATUSES,
  EVIDENCE_IDENTITY_STATUSES,
  OBSERVATION_DOMAINS,
  PROVIDER_CHOW_STATES,
  type DatePrecision,
  type EvidenceHospital,
  type EvidenceLedger,
  type EvidenceObservation,
  type EvidenceSource,
  type StructuralEvent,
  type ValidationIssue,
} from "../src/types.ts";

export interface EvidenceAdaptResult {
  ok: boolean;
  errors: ValidationIssue[];
  ledger?: EvidenceLedger;
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const YEAR_MONTH = /^(\d{4})-(\d{2})$/;
const YEAR_ONLY = /^(\d{4})$/;

function issue(code: string, path: string, message: string): ValidationIssue {
  return { code, path, message };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCalendarDate(value: string): boolean {
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utc = new Date(Date.UTC(year, month - 1, day));
  return utc.getUTCFullYear() === year && utc.getUTCMonth() === month - 1 && utc.getUTCDate() === day;
}

function isYearMonth(value: string): boolean {
  const match = YEAR_MONTH.exec(value);
  if (!match) return false;
  const month = Number(match[2]);
  return month >= 1 && month <= 12;
}

function inferPrecision(value: string): DatePrecision | null {
  if (isCalendarDate(value)) return "day";
  if (isYearMonth(value)) return "month";
  if (YEAR_ONLY.test(value)) return "year";
  return null;
}

function parseOptionalDate(
  errors: ValidationIssue[],
  value: unknown,
  path: string,
  precision?: unknown,
): { date: string | null; precision: DatePrecision | null } {
  if (value === null || value === undefined) {
    if (precision !== undefined && precision !== null && !(DATE_PRECISIONS as readonly string[]).includes(String(precision))) {
      errors.push(issue("INVALID_ENUM", `${path.replace(/]$/, "")}_precision]`, `Date precision must be one of: ${DATE_PRECISIONS.join(", ")}.`));
    }
    return { date: null, precision: precision === "unknown" ? "unknown" : null };
  }
  if (typeof value !== "string") {
    errors.push(issue("INVALID_TYPE", path, "Date must be a string or null."));
    return { date: null, precision: null };
  }
  const inferred = inferPrecision(value);
  if (!inferred) {
    errors.push(issue("INVALID_DATE", path, `Unrecognized date "${value}". Use YYYY, YYYY-MM, or YYYY-MM-DD.`));
    return { date: null, precision: null };
  }
  if (precision !== undefined && precision !== null) {
    if (!(DATE_PRECISIONS as readonly string[]).includes(String(precision))) {
      errors.push(issue("INVALID_ENUM", path, `Date precision must be one of: ${DATE_PRECISIONS.join(", ")}.`));
    } else if (precision !== inferred) {
      errors.push(
        issue(
          "INVALID_DATE",
          path,
          `Date "${value}" does not match declared precision "${String(precision)}". Precision was not repaired.`,
        ),
      );
    }
  }
  return { date: value, precision: inferred };
}

function requireString(errors: ValidationIssue[], value: unknown, path: string, label: string): string | null {
  if (typeof value !== "string" || value.trim() === "") {
    errors.push(issue("MISSING_REQUIRED_FIELD", path, `${label} is required.`));
    return null;
  }
  return value;
}

function requireEnum<T extends string>(
  errors: ValidationIssue[],
  value: unknown,
  path: string,
  allowed: readonly T[],
  label: string,
): T | null {
  if (typeof value !== "string" || !(allowed as readonly string[]).includes(value)) {
    errors.push(issue("INVALID_ENUM", path, `${label} must be one of: ${allowed.join(", ")}.`));
    return null;
  }
  return value as T;
}

function eligibilityForPublication(publicationDate: string | null): { eligible: boolean; note: string } {
  if (publicationDate === null) {
    return {
      eligible: false,
      note: "Publication date is null, so this source is not historically eligible.",
    };
  }
  return {
    eligible: false,
    note: "Publication date is recorded but historical-eligibility testing has not been assessed.",
  };
}

function uniqueIds(errors: ValidationIssue[], id: string, path: string, seen: Map<string, string>, label: string): void {
  const previous = seen.get(id);
  if (previous) {
    errors.push(issue("DUPLICATE_RECORD", path, `Duplicate ${label} "${id}" (also ${previous}).`));
  } else {
    seen.set(id, path);
  }
}

export function adaptEvidencePack(input: unknown): EvidenceAdaptResult {
  const errors: ValidationIssue[] = [];
  if (!isPlainObject(input)) {
    return { ok: false, errors: [issue("MALFORMED_INPUT", "$", "Evidence pack must be an object.")] };
  }

  const hospitalsRaw = input.hospitals;
  const sourcesRaw = input.sources;
  const eventsRaw = input.events;
  const observationsRaw = input.observations;
  if (!Array.isArray(hospitalsRaw) || !Array.isArray(sourcesRaw) || !Array.isArray(eventsRaw) || !Array.isArray(observationsRaw)) {
    return {
      ok: false,
      errors: [
        issue("MALFORMED_INPUT", "$", "Evidence pack must include hospitals, sources, events, and observations arrays."),
      ],
    };
  }

  const hospitals: EvidenceHospital[] = [];
  const hospitalIds = new Map<string, string>();
  hospitalsRaw.forEach((item, index) => {
    const path = `$.hospitals[${index}]`;
    if (item == null || !isPlainObject(item)) {
      errors.push(issue("MALFORMED_INPUT", path, "Hospital entries cannot be null."));
      return;
    }
    const hospitalId = requireString(errors, item.hospital_id, `${path}.hospital_id`, "hospital_id");
    const name = requireString(errors, item.name, `${path}.name`, "Hospital name");
    const city = requireString(errors, item.city, `${path}.city`, "City");
    const identityStatus = requireEnum(
      errors,
      item.identity_status,
      `${path}.identity_status`,
      EVIDENCE_IDENTITY_STATUSES,
      "identity_status",
    );
    const providerChow = requireEnum(errors, item.provider_chow, `${path}.provider_chow`, PROVIDER_CHOW_STATES, "provider_chow");
    if (item.ccn_at_event !== null && item.ccn_at_event !== undefined) {
      if (typeof item.ccn_at_event !== "string" || !/^\d{6}$/.test(item.ccn_at_event)) {
        errors.push(issue("INVALID_CCN", `${path}.ccn_at_event`, "ccn_at_event must be a six-digit string or null. CCN was not invented."));
      }
    }
    if (!hospitalId || !name || !city || !identityStatus || !providerChow) return;
    uniqueIds(errors, hospitalId, path, hospitalIds, "hospital_id");
    hospitals.push({
      hospitalId,
      name,
      city,
      identityStatus,
      ccnAtEvent: typeof item.ccn_at_event === "string" ? item.ccn_at_event : null,
      providerChow,
      financialCoverage: identityStatus === "existing_research_id" ? "available" : "pending",
    });
  });

  const sources = new Map<string, EvidenceSource>();
  const sourceIds = new Map<string, string>();
  sourcesRaw.forEach((item, index) => {
    const path = `$.sources[${index}]`;
    if (item == null || !isPlainObject(item)) {
      errors.push(issue("MALFORMED_INPUT", path, "Source entries cannot be null."));
      return;
    }
    const sourceId = requireString(errors, item.source_id, `${path}.source_id`, "source_id");
    const url = requireString(errors, item.url, `${path}.url`, "Source URL");
    const title = requireString(errors, item.title, `${path}.title`, "Source title");
    const sourceType = requireString(errors, item.source_type, `${path}.source_type`, "source_type");
    const accessDate = requireString(errors, item.access_date, `${path}.access_date`, "access_date");
    const publication = parseOptionalDate(errors, item.publication_date, `${path}.publication_date`);
    if (!sourceId || !url || !title || !sourceType || !accessDate) return;
    uniqueIds(errors, sourceId, path, sourceIds, "source_id");
    const eligibility = eligibilityForPublication(publication.date);
    sources.set(sourceId, {
      sourceId,
      url,
      title,
      publicationDate: publication.date,
      publicationPrecision: publication.precision,
      sourceType,
      accessDate,
      historicallyEligible: eligibility.eligible,
      eligibilityNote: eligibility.note,
    });
  });

  const events: StructuralEvent[] = [];
  const eventIds = new Map<string, string>();
  eventsRaw.forEach((item, index) => {
    const path = `$.events[${index}]`;
    if (item == null || !isPlainObject(item)) {
      errors.push(issue("MALFORMED_INPUT", path, "Event entries cannot be null."));
      return;
    }
    const eventId = requireString(errors, item.event_id, `${path}.event_id`, "event_id");
    const hospitalId = requireString(errors, item.hospital_id, `${path}.hospital_id`, "hospital_id");
    const category = requireEnum(errors, item.event_category, `${path}.event_category`, EVENT_CATEGORIES, "event_category");
    const status = requireEnum(errors, item.event_status, `${path}.event_status`, EVENT_STATUSES, "event_status");
    const scope = requireEnum(errors, item.scope, `${path}.scope`, EVENT_SCOPES, "scope");
    const eventConfidence = requireEnum(errors, item.event_confidence, `${path}.event_confidence`, CONFIDENCE_LEVELS, "event_confidence");
    const identityConfidence = requireEnum(
      errors,
      item.identity_confidence,
      `${path}.identity_confidence`,
      CONFIDENCE_LEVELS,
      "identity_confidence",
    );
    const cutoff = requireEnum(
      errors,
      item.available_before_cutoff,
      `${path}.available_before_cutoff`,
      CUTOFF_STATES,
      "available_before_cutoff",
    );
    const subtype = requireString(errors, item.event_subtype, `${path}.event_subtype`, "event_subtype");
    const notes = requireString(errors, item.notes, `${path}.notes`, "notes");
    const eventGroup = requireString(errors, item.event_group, `${path}.event_group`, "event_group");
    const effective = parseOptionalDate(errors, item.effective_date, `${path}.effective_date`, item.effective_date_precision);
    const announcement = parseOptionalDate(errors, item.announcement_date, `${path}.announcement_date`);
    if (item.verified_outcome !== undefined && typeof item.verified_outcome !== "boolean") {
      errors.push(issue("INVALID_TYPE", `${path}.verified_outcome`, "verified_outcome must be a boolean."));
    }
    if (item.experimental_signal !== undefined && typeof item.experimental_signal !== "boolean") {
      errors.push(issue("INVALID_TYPE", `${path}.experimental_signal`, "experimental_signal must be a boolean."));
    }
    if (item.ccn_at_event !== null && item.ccn_at_event !== undefined) {
      if (typeof item.ccn_at_event !== "string" || !/^\d{6}$/.test(item.ccn_at_event)) {
        errors.push(issue("INVALID_CCN", `${path}.ccn_at_event`, "ccn_at_event must be a six-digit string or null."));
      }
    }
    if (item.buyer !== null && item.buyer !== undefined && typeof item.buyer !== "string") {
      errors.push(issue("INVALID_TYPE", `${path}.buyer`, "buyer must be a string or null."));
    }
    if (item.seller !== null && item.seller !== undefined && typeof item.seller !== "string") {
      errors.push(issue("INVALID_TYPE", `${path}.seller`, "seller must be a string or null."));
    }
    if (!Array.isArray(item.source_ids) || item.source_ids.length === 0) {
      errors.push(issue("MISSING_REQUIRED_FIELD", `${path}.source_ids`, "source_ids must be a non-empty array."));
    }
    const resolvedSources: EvidenceSource[] = [];
    if (Array.isArray(item.source_ids)) {
      item.source_ids.forEach((sourceId, sourceIndex) => {
        if (typeof sourceId !== "string") {
          errors.push(issue("INVALID_TYPE", `${path}.source_ids[${sourceIndex}]`, "source_id must be a string."));
          return;
        }
        const source = sources.get(sourceId);
        if (!source) {
          errors.push(issue("DANGLING_REFERENCE", `${path}.source_ids[${sourceIndex}]`, `Unresolved source reference "${sourceId}".`));
          return;
        }
        resolvedSources.push(source);
      });
    }
    if (hospitalId && !hospitalIds.has(hospitalId)) {
      errors.push(issue("DANGLING_REFERENCE", `${path}.hospital_id`, `Unresolved hospital reference "${hospitalId}".`));
    }
    if (
      !eventId ||
      !hospitalId ||
      !category ||
      !status ||
      !scope ||
      !eventConfidence ||
      !identityConfidence ||
      !cutoff ||
      !subtype ||
      !notes ||
      !eventGroup
    ) {
      return;
    }
    uniqueIds(errors, eventId, path, eventIds, "event_id");
    events.push({
      eventId,
      hospitalId,
      eventCategory: category,
      eventSubtype: subtype,
      eventStatus: status,
      effectiveDate: effective.date,
      effectiveDatePrecision: effective.precision ?? "unknown",
      announcementDate: announcement.date,
      sources: resolvedSources,
      buyer: typeof item.buyer === "string" ? item.buyer : null,
      seller: typeof item.seller === "string" ? item.seller : null,
      scope,
      eventConfidence,
      identityConfidence,
      verifiedOutcome: item.verified_outcome === true,
      notes,
      ccnAtEvent: typeof item.ccn_at_event === "string" ? item.ccn_at_event : null,
      predictionCutoff: typeof item.prediction_cutoff === "string" ? item.prediction_cutoff : null,
      experimentalSignal: item.experimental_signal === true,
      availableBeforeCutoff: cutoff,
      eventGroup,
    });
  });

  const observations: EvidenceObservation[] = [];
  const observationIds = new Map<string, string>();
  observationsRaw.forEach((item, index) => {
    const path = `$.observations[${index}]`;
    if (item == null || !isPlainObject(item)) {
      errors.push(issue("MALFORMED_INPUT", path, "Observation entries cannot be null."));
      return;
    }
    const observationId = requireString(errors, item.observation_id, `${path}.observation_id`, "observation_id");
    const hospitalId = requireString(errors, item.hospital_id, `${path}.hospital_id`, "hospital_id");
    const domain = requireEnum(errors, item.domain, `${path}.domain`, OBSERVATION_DOMAINS, "domain");
    const metric = requireString(errors, item.metric, `${path}.metric`, "metric");
    const unit = requireString(errors, item.unit, `${path}.unit`, "unit");
    const scope = requireString(errors, item.scope, `${path}.scope`, "scope");
    const identityConfidence = requireEnum(
      errors,
      item.identity_confidence,
      `${path}.identity_confidence`,
      CONFIDENCE_LEVELS,
      "identity_confidence",
    );
    const publication = parseOptionalDate(errors, item.publication_date, `${path}.publication_date`);
    if (item.value !== null && item.value !== undefined && (typeof item.value !== "number" || !Number.isFinite(item.value))) {
      errors.push(issue("INVALID_TYPE", `${path}.value`, "value must be a finite number or null."));
    }
    if (item.historical_feature_eligible === true && publication.date === null) {
      errors.push(
        issue(
          "INVALID_ENUM",
          `${path}.historical_feature_eligible`,
          "A null publication date is not historical eligibility. historical_feature_eligible cannot be true.",
        ),
      );
    }
    if (item.reporting_period !== null && item.reporting_period !== undefined && typeof item.reporting_period !== "string") {
      errors.push(issue("INVALID_TYPE", `${path}.reporting_period`, "reporting_period must be a string or null."));
    }
    if (!Array.isArray(item.source_ids) || item.source_ids.length === 0) {
      errors.push(issue("MISSING_REQUIRED_FIELD", `${path}.source_ids`, "source_ids must be a non-empty array."));
    }
    const resolvedSources: EvidenceSource[] = [];
    if (Array.isArray(item.source_ids)) {
      item.source_ids.forEach((sourceId, sourceIndex) => {
        if (typeof sourceId !== "string") {
          errors.push(issue("INVALID_TYPE", `${path}.source_ids[${sourceIndex}]`, "source_id must be a string."));
          return;
        }
        const source = sources.get(sourceId);
        if (!source) {
          errors.push(issue("DANGLING_REFERENCE", `${path}.source_ids[${sourceIndex}]`, `Unresolved source reference "${sourceId}".`));
          return;
        }
        resolvedSources.push(source);
      });
    }
    if (hospitalId && !hospitalIds.has(hospitalId)) {
      errors.push(issue("DANGLING_REFERENCE", `${path}.hospital_id`, `Unresolved hospital reference "${hospitalId}".`));
    }
    if (!observationId || !hospitalId || !domain || !metric || !unit || !scope || !identityConfidence) return;
    uniqueIds(errors, observationId, path, observationIds, "observation_id");
    observations.push({
      observationId,
      hospitalId,
      domain,
      metric,
      value: typeof item.value === "number" ? item.value : null,
      unit,
      reportingPeriod: typeof item.reporting_period === "string" ? item.reporting_period : null,
      scope,
      sources: resolvedSources,
      sourcePage: typeof item.source_page === "string" ? item.source_page : null,
      publicationDate: publication.date,
      accessDate: typeof item.access_date === "string" ? item.access_date : "",
      identityConfidence,
      evidenceClass: typeof item.evidence_class === "string" ? item.evidence_class : "",
      extractionStatus: typeof item.extraction_status === "string" ? item.extraction_status : "",
      historicalFeatureEligible: item.historical_feature_eligible === true,
      limitations: typeof item.limitations === "string" ? item.limitations : "",
    });
  });

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const domainCoverage =
    isPlainObject(input.domain_coverage)
      ? Object.fromEntries(
          Object.entries(input.domain_coverage).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
        )
      : {};
  const openResearch = Array.isArray(input.open_research)
    ? input.open_research.filter((item): item is string => typeof item === "string")
    : [];
  const rules = Array.isArray(input.rules) ? input.rules.filter((item): item is string => typeof item === "string") : [];

  return {
    ok: true,
    errors,
    ledger: {
      hospitals,
      events,
      observations,
      domainCoverage,
      openResearch,
      rules,
    },
  };
}

export function eventsForHospital(ledger: EvidenceLedger | undefined, hospitalId: string): StructuralEvent[] {
  if (!ledger) return [];
  return ledger.events
    .filter((event) => event.hospitalId === hospitalId)
    .sort((left, right) => (left.effectiveDate ?? "").localeCompare(right.effectiveDate ?? ""));
}

export function observationsForHospital(ledger: EvidenceLedger | undefined, hospitalId: string): EvidenceObservation[] {
  if (!ledger) return [];
  return ledger.observations.filter((observation) => observation.hospitalId === hospitalId);
}
