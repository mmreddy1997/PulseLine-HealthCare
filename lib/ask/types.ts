import type {
  EvidenceHospital,
  EvidenceObservation,
  HospitalView,
  StructuralEvent,
} from "../../src/types.ts";

export const ANSWER_KINDS = ["reported", "calculated", "experimental_interpretation"] as const;
export type AnswerKind = (typeof ANSWER_KINDS)[number];

export const ANSWER_STATUSES = ["complete", "incomplete", "unavailable", "clarification", "declined"] as const;
export type AnswerStatus = (typeof ANSWER_STATUSES)[number];

export const ANSWER_MODES = ["data_lookup", "on_device_explanation"] as const;
export type AnswerMode = (typeof ANSWER_MODES)[number];

export const ASK_INTENTS = [
  "why_score",
  "net_patient_revenue",
  "revenue_change",
  "operating_expenses",
  "cash",
  "missing_excluded",
  "structural_events",
  "community_context",
  "clarify_total",
  "clarify_year",
  "unsupported_forecast",
  "hospital_switch",
  "prompt_injection",
  "unknown",
] as const;
export type AskIntent = (typeof ASK_INTENTS)[number];

export interface AnswerSource {
  label: string;
  url: string | null;
  reportId: string | null;
}

export interface AnswerPeriod {
  start: string | null;
  end: string;
  fileCohort: number | null;
}

export interface ClarificationOption {
  id: string;
  label: string;
  intent: AskIntent;
  year?: number;
  yearKind?: "fiscal_end" | "file_cohort";
  metric?: "net_patient_revenue" | "operating_expenses" | "inpatient_days";
}

export interface PulseAnswer {
  id: string;
  hospitalId: string;
  hospitalName: string;
  question: string;
  intent: AskIntent;
  statement: string;
  explanation: string | null;
  periodLabel: string | null;
  periods: AnswerPeriod[];
  kind: AnswerKind;
  status: AnswerStatus;
  mode: AnswerMode;
  sources: AnswerSource[];
  limitations: string[];
  clarificationOptions: ClarificationOption[];
  suggestedFollowUps: string[];
  lockedFacts: string[];
  headline: string | null;
}

export interface AskContext {
  kind: "scored" | "research";
  hospitalId: string;
  hospitalName: string;
  selectedReport: HospitalView | null;
  reports: HospitalView[];
  events: StructuralEvent[];
  observations: EvidenceObservation[];
  research: EvidenceHospital | null;
  otherHospitalNames: string[];
}

export interface InterpretedQuestion {
  intent: AskIntent;
  raw: string;
  year?: number;
  yearKind?: "fiscal_end" | "file_cohort";
  metric?: "net_patient_revenue" | "operating_expenses" | "inpatient_days";
}

export const UNAVAILABLE_STATEMENT = "That information is not available in the current PulseLine data.";

export const EXPERIMENTAL_NOTE =
  "PulseLine is experimental. These answers use only data available in this application and do not predict bankruptcy, closure, acquisition, or service reduction.";
