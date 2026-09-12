import type { AskContext, ClarificationOption, InterpretedQuestion } from "./types.ts";

const FORECAST =
  /\b(predict|forecast|probability of (closure|bankruptcy)|next year'?s (score|revenue))\b|\b(will|going to)\b.{0,48}\b(close|fail|bankrupt|acquired|cut services?)\b/i;

const INJECTION =
  /\b(ignore (all )?(previous|prior|above) (instructions|rules|grounding)|you are now|disregard (your|the) (rules|instructions)|system prompt|jailbreak)\b/i;

const TOTAL_ONLY = /\b(what|which).{0,24}\btotal\b/i;
const HAS_REVENUE = /\brevenue\b/i;
const HAS_EXPENSE = /\b(expense|expenses|cost|costs)\b/i;
const HAS_DAYS = /\b(patient days|inpatient days|bed days)\b/i;

function normalize(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

function mentionsName(text: string, name: string): boolean {
  const hay = text.toLowerCase();
  const needle = name.toLowerCase();
  if (hay.includes(needle)) return true;
  const tokens = needle
    .replaceAll("/", " ")
    .replaceAll(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 3 && !["hospital", "medical", "center", "memorial", "county", "regional"].includes(token));
  if (tokens.length === 0) return false;
  return tokens.every((token) => hay.includes(token));
}

function extractYears(text: string): number[] {
  return [...text.matchAll(/\b(20\d{2})\b/g)].map((match) => Number(match[1]));
}

export function yearClarification(context: AskContext, year: number): ClarificationOption[] | null {
  const fiscal = context.reports.filter((report) => report.hospital.fiscalYearEnd.startsWith(String(year)));
  const cohort = context.reports.filter((report) => report.hospital.fileCohort === year);
  const fiscalIds = new Set(fiscal.map((report) => report.hospital.id));
  const cohortOnly = cohort.filter((report) => !fiscalIds.has(report.hospital.id));
  if (fiscal.length === 0 || cohortOnly.length === 0) return null;
  return [
    {
      id: `fiscal-${year}`,
      label: `The report ending in ${year}`,
      intent: "clarify_year",
      year,
      yearKind: "fiscal_end",
    },
    {
      id: `cohort-${year}`,
      label: `CMS file cohort ${year}`,
      intent: "clarify_year",
      year,
      yearKind: "file_cohort",
    },
  ];
}

export function interpretQuestion(raw: string, context: AskContext): InterpretedQuestion {
  const question = normalize(raw);
  const lower = question.toLowerCase();

  if (INJECTION.test(question)) {
    return { intent: "prompt_injection", raw: question };
  }

  const other = context.otherHospitalNames.find(
    (name) => mentionsName(question, name) && !mentionsName(question, context.hospitalName),
  );
  if (other) {
    return { intent: "hospital_switch", raw: question };
  }

  if (FORECAST.test(question)) {
    return { intent: "unsupported_forecast", raw: question };
  }

  if (TOTAL_ONLY.test(question) && !HAS_REVENUE.test(question) && !HAS_EXPENSE.test(question) && !HAS_DAYS.test(question)) {
    return { intent: "clarify_total", raw: question };
  }

  const years = extractYears(question);
  if (years.length === 1 && !/\b(selected|this) (fiscal |reporting )?period\b/i.test(question)) {
    const options = yearClarification(context, years[0]);
    if (options) {
      return { intent: "clarify_year", raw: question, year: years[0] };
    }
  }

  if (/\b(why).{0,40}\bscore\b|\breceive this score\b/.test(lower)) {
    return { intent: "why_score", raw: question };
  }
  if (/\b(revenue change|how did revenue|compared to (the )?previous|year.over.year|previous (available |comparable )?report)\b/.test(lower)) {
    return { intent: "revenue_change", raw: question, year: years[0], yearKind: years[0] ? "fiscal_end" : undefined };
  }
  if (/\bnet patient revenue\b|\bnpr\b|\bwhat was (its |the )?revenue\b/.test(lower)) {
    return { intent: "net_patient_revenue", raw: question, year: years[0], yearKind: years[0] ? "fiscal_end" : undefined };
  }
  if (HAS_EXPENSE.test(question) && !/\bmissing\b/.test(lower)) {
    return { intent: "operating_expenses", raw: question, year: years[0], yearKind: years[0] ? "fiscal_end" : undefined };
  }
  if (/\bcash\b/.test(lower) && !/\bmissing\b/.test(lower)) {
    return { intent: "cash", raw: question, year: years[0], yearKind: years[0] ? "fiscal_end" : undefined };
  }
  if (/\bmissing\b|\bexcluded\b|\bnot available\b|\bdata quality\b/.test(lower)) {
    return { intent: "missing_excluded", raw: question };
  }
  if (/\bevents?\b|\bacquisition\b|\bchow\b|\bbankruptcy\b|\bproperty\b|\brename\b/.test(lower)) {
    return { intent: "structural_events", raw: question };
  }
  if (/\bcommunity\b|\bchna\b|\bcounty access\b|\bworkforce access\b/.test(lower)) {
    return { intent: "community_context", raw: question };
  }

  return { intent: "unknown", raw: question };
}

export function totalClarificationOptions(): ClarificationOption[] {
  return [
    { id: "total-revenue", label: "Net patient revenue", intent: "net_patient_revenue", metric: "net_patient_revenue" },
    { id: "total-expenses", label: "Operating expenses", intent: "operating_expenses", metric: "operating_expenses" },
    { id: "total-days", label: "Patient days", intent: "unknown", metric: "inpatient_days" },
  ];
}
