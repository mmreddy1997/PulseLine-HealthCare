import { flaggedExplanations } from "../score-financial.ts";
import { fiscalLabel, moneyExact, moneyHeadline } from "../../src/ui/format.ts";
import { interpretQuestion, totalClarificationOptions, yearClarification } from "./interpret.ts";
import {
  EXPERIMENTAL_NOTE,
  UNAVAILABLE_STATEMENT,
  type AnswerPeriod,
  type AnswerSource,
  type AskContext,
  type AskIntent,
  type InterpretedQuestion,
  type PulseAnswer,
} from "./types.ts";

const METHOD_LIMIT =
  "Available in PulseLine. Historical CMS figures are not live conditions. Methodology is on the main page.";

function periodFromView(view: NonNullable<AskContext["selectedReport"]>): AnswerPeriod {
  return {
    start: view.hospital.fiscalYearStart,
    end: view.hospital.fiscalYearEnd,
    fileCohort: view.hospital.fileCohort,
  };
}

function cmsSource(view: NonNullable<AskContext["selectedReport"]>): AnswerSource {
  return {
    label: view.hospital.sourceId ?? "CMS cost report",
    url: view.hospital.sourceUrl,
    reportId: view.hospital.reportRecordId,
  };
}

function eventSources(context: AskContext): AnswerSource[] {
  const seen = new Set<string>();
  const sources: AnswerSource[] = [];
  for (const event of context.events) {
    for (const source of event.sources) {
      if (seen.has(source.sourceId)) continue;
      seen.add(source.sourceId);
      sources.push({ label: source.title, url: source.url, reportId: null });
    }
  }
  return sources;
}

function observationSources(context: AskContext, domain: "community" | "workforce_access"): AnswerSource[] {
  const seen = new Set<string>();
  const sources: AnswerSource[] = [];
  for (const item of context.observations.filter((row) => row.domain === domain)) {
    for (const source of item.sources) {
      if (seen.has(source.sourceId)) continue;
      seen.add(source.sourceId);
      sources.push({ label: source.title, url: source.url, reportId: null });
    }
  }
  return sources;
}

function publicationLimits(context: AskContext): string[] {
  const limits: string[] = [];
  for (const event of context.events) {
    for (const source of event.sources) {
      if (source.publicationDate === null) {
        limits.push(
          "At least one cited source has no publication date. A missing publication date is not evidence the source was available before the event.",
        );
        return limits;
      }
    }
  }
  return limits;
}

function baseAnswer(
  context: AskContext,
  question: string,
  intent: AskIntent,
  patch: Partial<PulseAnswer>,
): PulseAnswer {
  return {
    id: `${context.hospitalId}:${intent}:${patch.status ?? "complete"}:${question}`,
    hospitalId: context.hospitalId,
    hospitalName: context.hospitalName,
    question,
    intent,
    statement: patch.statement ?? UNAVAILABLE_STATEMENT,
    explanation: null,
    periodLabel: patch.periodLabel ?? null,
    periods: patch.periods ?? [],
    kind: patch.kind ?? "reported",
    status: patch.status ?? "unavailable",
    mode: "data_lookup",
    sources: patch.sources ?? [],
    limitations: patch.limitations ?? [METHOD_LIMIT],
    clarificationOptions: patch.clarificationOptions ?? [],
    suggestedFollowUps: patch.suggestedFollowUps ?? [],
    lockedFacts: patch.lockedFacts ?? [],
    headline: patch.headline ?? null,
  };
}

function resolveReport(context: AskContext, interpreted: InterpretedQuestion) {
  if (!context.selectedReport) return null;
  if (interpreted.year != null && interpreted.yearKind === "file_cohort") {
    return context.reports.find((report) => report.hospital.fileCohort === interpreted.year) ?? null;
  }
  if (interpreted.year != null && interpreted.yearKind === "fiscal_end") {
    return (
      context.reports.find((report) => report.hospital.fiscalYearEnd.startsWith(String(interpreted.year))) ??
      context.selectedReport
    );
  }
  return context.selectedReport;
}

function previousReport(context: AskContext, selected: NonNullable<AskContext["selectedReport"]>) {
  const ordered = [...context.reports].sort((left, right) =>
    left.hospital.fiscalYearEnd.localeCompare(right.hospital.fiscalYearEnd),
  );
  const index = ordered.findIndex((report) => report.hospital.id === selected.hospital.id);
  if (index <= 0) return null;
  return ordered[index - 1] ?? null;
}

function periodsOverlap(
  left: NonNullable<AskContext["selectedReport"]>,
  right: NonNullable<AskContext["selectedReport"]>,
): boolean {
  const leftStart = left.hospital.fiscalYearStart ?? left.hospital.fiscalYearEnd;
  const rightStart = right.hospital.fiscalYearStart ?? right.hospital.fiscalYearEnd;
  return leftStart < right.hospital.fiscalYearEnd && rightStart < left.hospital.fiscalYearEnd;
}

function answerWhyScore(context: AskContext, question: string): PulseAnswer {
  const view = context.selectedReport;
  if (context.kind !== "scored" || !view) {
    return baseAnswer(context, question, "why_score", {
      status: "unavailable",
      statement: UNAVAILABLE_STATEMENT,
      limitations: [
        "Financial data pending. No CCN, license ID, cost-report financials, or stress score were invented for this case.",
        METHOD_LIMIT,
      ],
    });
  }
  const score = view.financial.score;
  const reasons = flaggedExplanations(view.financial);
  const period = fiscalLabel(view.hospital.fiscalYearStart, view.hospital.fiscalYearEnd);
  const statement =
    score === null
      ? `${context.hospitalName} has no PulseLine score for ${period} because no financial factor could be scored.`
      : `${context.hospitalName} received a PulseLine score of ${score} (${view.financial.status}) for ${period}. ${reasons.join(" ")}`;
  return baseAnswer(context, question, "why_score", {
    status: "complete",
    kind: "calculated",
    statement,
    periodLabel: period,
    periods: [periodFromView(view)],
    sources: [cmsSource(view)],
    lockedFacts: score === null ? ["score=null"] : [`score=${score}`, `status=${view.financial.status}`],
    limitations: [
      "The score is an experimental interpretation of available factors on this historical report. It is not a probability of closure or bankruptcy.",
      METHOD_LIMIT,
    ],
    suggestedFollowUps: ["What information is missing or excluded?"],
  });
}

function answerMoney(
  context: AskContext,
  question: string,
  intent: "net_patient_revenue" | "operating_expenses" | "cash",
  interpreted: InterpretedQuestion,
): PulseAnswer {
  if (context.kind !== "scored" || !context.selectedReport) {
    return baseAnswer(context, question, intent, {
      status: "unavailable",
      statement: UNAVAILABLE_STATEMENT,
      limitations: [
        "Financial data pending. PulseLine does not invent revenue, expenses, cash, or a score for this case.",
        METHOD_LIMIT,
      ],
    });
  }
  const view = resolveReport(context, interpreted);
  if (!view) {
    return baseAnswer(context, question, intent, { status: "unavailable", statement: UNAVAILABLE_STATEMENT });
  }
  const value =
    intent === "net_patient_revenue"
      ? view.hospital.financials.netPatientRevenue
      : intent === "operating_expenses"
        ? view.hospital.financials.operatingExpenses
        : view.hospital.financials.cash;
  const label =
    intent === "net_patient_revenue"
      ? "Net Patient Revenue"
      : intent === "operating_expenses"
        ? "Less Total Operating Expense"
        : "Cash on Hand and in Banks";
  const period = fiscalLabel(view.hospital.fiscalYearStart, view.hospital.fiscalYearEnd);
  if (value === null) {
    return baseAnswer(context, question, intent, {
      status: "unavailable",
      statement: UNAVAILABLE_STATEMENT,
      periodLabel: period,
      periods: [periodFromView(view)],
      sources: [cmsSource(view)],
      limitations: [`${label} is missing in this report. Missing is not the same as zero.`, METHOD_LIMIT],
    });
  }
  const exact = moneyExact(value);
  const zeroNote = value === 0 ? " This is a reported zero, not a missing value." : "";
  const negativeNote = value < 0 ? " The negative sign is preserved from the CMS report." : "";
  return baseAnswer(context, question, intent, {
    status: "complete",
    kind: "reported",
    statement: `${context.hospitalName} reported ${label} of ${exact} for ${period}.${zeroNote}${negativeNote}`,
    periodLabel: period,
    periods: [periodFromView(view)],
    sources: [cmsSource(view)],
    lockedFacts: [`${intent}=${value}`, exact],
    headline: moneyHeadline(value),
    limitations: [METHOD_LIMIT],
    suggestedFollowUps:
      intent === "net_patient_revenue" && context.reports.length > 1
        ? ["How did revenue change from the previous comparable report?"]
        : [],
  });
}

function answerRevenueChange(context: AskContext, question: string, interpreted: InterpretedQuestion): PulseAnswer {
  if (context.kind !== "scored" || !context.selectedReport) {
    return baseAnswer(context, question, "revenue_change", {
      status: "unavailable",
      statement: UNAVAILABLE_STATEMENT,
      limitations: ["Financial data pending. No year-over-year revenue comparison is possible.", METHOD_LIMIT],
    });
  }
  const selected = resolveReport(context, interpreted);
  if (!selected) {
    return baseAnswer(context, question, "revenue_change", { status: "unavailable", statement: UNAVAILABLE_STATEMENT });
  }
  const previous = previousReport(context, selected);
  if (!previous) {
    return baseAnswer(context, question, "revenue_change", {
      status: "unavailable",
      statement: UNAVAILABLE_STATEMENT,
      periodLabel: fiscalLabel(selected.hospital.fiscalYearStart, selected.hospital.fiscalYearEnd),
      limitations: ["No earlier comparable report is available in PulseLine for this hospital.", METHOD_LIMIT],
    });
  }
  if (periodsOverlap(selected, previous)) {
    return baseAnswer(context, question, "revenue_change", {
      status: "unavailable",
      statement: UNAVAILABLE_STATEMENT,
      limitations: ["These fiscal periods overlap, so PulseLine does not subtract or combine them.", METHOD_LIMIT],
    });
  }
  const currentValue = selected.hospital.financials.netPatientRevenue;
  const previousValue = previous.hospital.financials.netPatientRevenue;
  const currentPeriod = fiscalLabel(selected.hospital.fiscalYearStart, selected.hospital.fiscalYearEnd);
  const previousPeriod = fiscalLabel(previous.hospital.fiscalYearStart, previous.hospital.fiscalYearEnd);
  if (currentValue === null || previousValue === null) {
    return baseAnswer(context, question, "revenue_change", {
      status: "unavailable",
      statement: UNAVAILABLE_STATEMENT,
      periods: [periodFromView(previous), periodFromView(selected)],
      sources: [cmsSource(previous), cmsSource(selected)],
      limitations: ["A year-over-year change needs Net Patient Revenue on both reports. Missing is not zero.", METHOD_LIMIT],
    });
  }
  const delta = currentValue - previousValue;
  const percent =
    previousValue === 0
      ? "Percent change is not interpretable because the earlier Net Patient Revenue is zero."
      : `That is a ${moneyExact(delta)} difference (${((delta / previousValue) * 100).toFixed(1)}%) between two reports, not a multi-year trend.`;
  const statement = `${context.hospitalName} reported Net Patient Revenue of ${moneyExact(previousValue)} for ${previousPeriod} and ${moneyExact(currentValue)} for ${currentPeriod}. ${percent}`;
  return baseAnswer(context, question, "revenue_change", {
    status: "complete",
    kind: "calculated",
    statement,
    periodLabel: `${previousPeriod} → ${currentPeriod}`,
    periods: [periodFromView(previous), periodFromView(selected)],
    sources: [cmsSource(previous), cmsSource(selected)],
    lockedFacts: [
      `previous=${previousValue}`,
      `current=${currentValue}`,
      `delta=${delta}`,
      moneyExact(previousValue),
      moneyExact(currentValue),
      moneyExact(delta),
    ],
    limitations: [
      "Comparison uses the same CMS measure, USD units, and this hospital only. Reports are not summed.",
      METHOD_LIMIT,
    ],
  });
}

function answerMissing(context: AskContext, question: string): PulseAnswer {
  if (context.kind !== "scored" || !context.selectedReport) {
    return baseAnswer(context, question, "missing_excluded", {
      status: "complete",
      kind: "reported",
      statement: `${context.hospitalName} is a research case with financial coverage pending. No cost-report financials or score are available in PulseLine.`,
      limitations: ["Financial data pending must not produce a score or a reassuring status.", METHOD_LIMIT],
    });
  }
  const view = context.selectedReport;
  const period = fiscalLabel(view.hospital.fiscalYearStart, view.hospital.fiscalYearEnd);
  const missing = view.hospital.dataQuality.missingFields;
  const exclusions = view.financial.exclusions;
  const unsupported = view.financial.factors.filter((factor) => factor.availability === "unsupported").map((factor) => factor.metric);
  const parts = [
    missing.length ? `Missing fields: ${missing.join(", ")}.` : "No missing metric names are recorded on this report.",
    exclusions.length ? `Excluded calculations: ${exclusions.join(" ")}` : "No ratio exclusions are recorded.",
    unsupported.length ? `Unsupported calculations: ${unsupported.join(", ")}.` : "",
  ].filter(Boolean);
  return baseAnswer(context, question, "missing_excluded", {
    status: "complete",
    kind: "reported",
    statement: `For ${context.hospitalName} (${period}): ${parts.join(" ")}`,
    periodLabel: period,
    periods: [periodFromView(view)],
    sources: [cmsSource(view)],
    limitations: ["Missing is not zero. Negative published balances are preserved and may make a ratio uninterpretable.", METHOD_LIMIT],
  });
}

function categoryPhrase(category: string): string {
  if (category === "property_transaction") return "a property transaction, not a verified provider CHOW";
  if (category === "parent_bankruptcy") return "a parent bankruptcy event, not a verified facility bankruptcy";
  if (category === "parent_restructuring") return "a parent restructuring event, not a verified facility outcome";
  return "an acquisition or rename record";
}

function answerEvents(context: AskContext, question: string): PulseAnswer {
  if (context.events.length === 0) {
    return baseAnswer(context, question, "structural_events", {
      status: "unavailable",
      statement: UNAVAILABLE_STATEMENT,
      limitations: ["No verified structural events are attached to this hospital in the current evidence ledger.", METHOD_LIMIT],
    });
  }
  const groups = new Map<string, typeof context.events>();
  for (const event of context.events) {
    const list = groups.get(event.eventGroup) ?? [];
    list.push(event);
    groups.set(event.eventGroup, list);
  }
  const lines: string[] = [];
  for (const groupEvents of groups.values()) {
    const labels = groupEvents.map((event) => `${event.eventSubtype.replaceAll("_", " ")} (${categoryPhrase(event.eventCategory)})`);
    if (groupEvents[0]?.eventCategory === "acquisition") {
      lines.push(
        `${labels.join("; ")}. Acquisition and rename share one event group and are not counted twice.`,
      );
    } else {
      lines.push(labels.join("; "));
    }
  }
  return baseAnswer(context, question, "structural_events", {
    status: "complete",
    kind: "reported",
    statement: `Documented events for ${context.hospitalName}: ${lines.join(" ")}`,
    sources: eventSources(context),
    limitations: [
      ...publicationLimits(context),
      "Event dates are not fiscal periods or CMS file cohorts.",
      METHOD_LIMIT,
    ],
  });
}

function answerCommunity(context: AskContext, question: string): PulseAnswer {
  const rows = context.observations.filter((item) => item.domain === "community" || item.domain === "workforce_access");
  if (rows.length === 0) {
    return baseAnswer(context, question, "community_context", {
      status: "unavailable",
      statement: UNAVAILABLE_STATEMENT,
      limitations: ["No community or county-access observations are attached to this hospital.", METHOD_LIMIT],
    });
  }
  const summary = rows
    .map((item) => {
      const value = item.value === null ? "unknown" : String(item.value);
      return `${item.metric.replaceAll("_", " ")}: ${value} ${item.unit}${item.reportingPeriod ? ` (${item.reportingPeriod})` : ""}`;
    })
    .join("; ");
  return baseAnswer(context, question, "community_context", {
    status: "complete",
    kind: "reported",
    statement: `Community and county-access context for ${context.hospitalName}: ${summary}. These are not hospital staffing measures.`,
    sources: [...observationSources(context, "community"), ...observationSources(context, "workforce_access")],
    limitations: [
      "County community and access measures are not hospital staffing measures.",
      METHOD_LIMIT,
    ],
  });
}

export function answerQuestion(context: AskContext, rawQuestion: string, interpreted?: InterpretedQuestion): PulseAnswer {
  const parsed = interpreted ?? interpretQuestion(rawQuestion, context);
  const question = parsed.raw;

  if (parsed.intent === "prompt_injection") {
    return baseAnswer(context, question, "prompt_injection", {
      status: "declined",
      kind: "experimental_interpretation",
      statement: `PulseLine Ask uses only approved data for ${context.hospitalName}. Source text and questions cannot override that.`,
      limitations: [METHOD_LIMIT],
      suggestedFollowUps: suggestedFallback(context),
    });
  }
  if (parsed.intent === "hospital_switch") {
    return baseAnswer(context, question, "hospital_switch", {
      status: "declined",
      kind: "experimental_interpretation",
      statement: `PulseLine Ask stays on ${context.hospitalName}. Close this hospital to open another. Conversations are not mixed across hospitals.`,
      limitations: [METHOD_LIMIT],
    });
  }
  if (parsed.intent === "unsupported_forecast") {
    return baseAnswer(context, question, "unsupported_forecast", {
      status: "declined",
      kind: "experimental_interpretation",
      statement:
        "PulseLine does not predict bankruptcy, closure, acquisition, or service reduction. It can only report historical figures and documented events that are already in the application.",
      limitations: [EXPERIMENTAL_NOTE],
      suggestedFollowUps: suggestedFallback(context),
    });
  }
  if (parsed.intent === "clarify_total") {
    return baseAnswer(context, question, "clarify_total", {
      status: "clarification",
      kind: "experimental_interpretation",
      statement: "Which total do you mean: revenue, expenses, or patient days?",
      clarificationOptions: totalClarificationOptions(),
      limitations: [METHOD_LIMIT],
    });
  }
  if (parsed.intent === "clarify_year" && parsed.year != null && !parsed.yearKind) {
    const options = yearClarification(context, parsed.year) ?? [];
    return baseAnswer(context, question, "clarify_year", {
      status: "clarification",
      kind: "experimental_interpretation",
      statement: `Do you mean the report ending in ${parsed.year} or CMS file cohort ${parsed.year}?`,
      clarificationOptions: options,
      limitations: ["Historical fiscal periods, CMS file cohorts, publication dates, and event dates are different concepts."],
    });
  }
  if (parsed.intent === "unknown") {
    if (parsed.metric === "inpatient_days") {
      const view = context.selectedReport;
      const days = view?.hospital.financials.inpatientDays ?? null;
      if (context.kind !== "scored" || !view || days === null) {
        return baseAnswer(context, question, "unknown", { status: "unavailable", statement: UNAVAILABLE_STATEMENT });
      }
      const period = fiscalLabel(view.hospital.fiscalYearStart, view.hospital.fiscalYearEnd);
      return baseAnswer(context, question, "unknown", {
        status: "complete",
        kind: "reported",
        statement: `${context.hospitalName} reported Total Days of ${days.toLocaleString("en-US")} for ${period}.`,
        periodLabel: period,
        periods: [periodFromView(view)],
        sources: [cmsSource(view)],
        lockedFacts: [`inpatient_days=${days}`],
        limitations: [METHOD_LIMIT],
      });
    }
    return baseAnswer(context, question, "unknown", {
      status: "unavailable",
      statement: UNAVAILABLE_STATEMENT,
      suggestedFollowUps: suggestedFallback(context),
      limitations: [METHOD_LIMIT],
    });
  }
  if (parsed.intent === "why_score") return answerWhyScore(context, question);
  if (parsed.intent === "net_patient_revenue") return answerMoney(context, question, "net_patient_revenue", parsed);
  if (parsed.intent === "operating_expenses") return answerMoney(context, question, "operating_expenses", parsed);
  if (parsed.intent === "cash") return answerMoney(context, question, "cash", parsed);
  if (parsed.intent === "revenue_change") return answerRevenueChange(context, question, parsed);
  if (parsed.intent === "missing_excluded") return answerMissing(context, question);
  if (parsed.intent === "structural_events") return answerEvents(context, question);
  if (parsed.intent === "community_context") return answerCommunity(context, question);
  return baseAnswer(context, question, parsed.intent, { status: "unavailable", statement: UNAVAILABLE_STATEMENT });
}

function suggestedFallback(context: AskContext): string[] {
  if (context.kind === "research") {
    return ["What documented structural events relate to this hospital?", "What community context is available?"];
  }
  return ["Why did this hospital receive this score?", "What was net patient revenue for this fiscal period?"];
}

export function applyModelExplanation(answer: PulseAnswer, explanation: string | null): PulseAnswer {
  if (answer.status !== "complete" || !explanation) {
    return { ...answer, mode: "data_lookup", explanation: null };
  }
  const extraMoney = [...explanation.matchAll(/-?\$[\d,]+(?:\.\d+)?/g)].some((match) => {
    const compact = match[0].replaceAll(",", "");
    return !answer.lockedFacts.some((fact) => fact.includes(compact) || fact.includes(match[0]));
  });
  if (extraMoney) {
    return { ...answer, mode: "data_lookup", explanation: null };
  }
  return { ...answer, mode: "on_device_explanation", explanation };
}

export function answerKnownIntent(context: AskContext, question: string, intent: AskIntent): PulseAnswer {
  return answerQuestion(context, question, { intent, raw: question });
}
