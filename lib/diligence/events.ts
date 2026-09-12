import type { StructuralEvent } from "../../src/types.ts";

export const VERIFICATION_LABELS = [
  "supported_by_cited_source",
  "partially_verified",
  "unknown_requires_verification",
] as const;
export type VerificationLabel = (typeof VERIFICATION_LABELS)[number];

export const VERIFICATION_COPY: Record<VerificationLabel, string> = {
  supported_by_cited_source: "Supported by cited source",
  partially_verified: "Partially verified",
  unknown_requires_verification: "Unknown / requires verification",
};

export const VERIFICATION_LIMIT =
  "These labels describe PulseLine’s sourced ledger. They are not an independent legal audit.";

export function eventVerificationLabel(event: StructuralEvent): VerificationLabel {
  if (event.eventStatus === "unknown" || event.eventStatus === "unverified") {
    return "unknown_requires_verification";
  }
  if (event.eventStatus === "verified_parent_event") return "partially_verified";
  if (event.eventConfidence === "high" && event.identityConfidence === "high") {
    return "supported_by_cited_source";
  }
  if (event.eventConfidence === "partial" || event.identityConfidence !== "high") {
    return "partially_verified";
  }
  return "supported_by_cited_source";
}

export function eventScopeLabel(event: StructuralEvent): string {
  if (event.scope === "property") return "Property · not a verified provider CHOW";
  if (event.eventStatus === "verified_parent_event") return "Parent · not a verified facility bankruptcy";
  if (event.scope === "parent_and_named_debtors") return "Parent and named debtors · not automatically a facility event";
  if (event.scope === "parent") return "Parent";
  return "Hospital / provider";
}

export function eventCategoryLabel(event: StructuralEvent): string {
  if (event.eventCategory === "property_transaction") return "Property transaction";
  if (event.eventCategory === "parent_bankruptcy") return "Parent bankruptcy";
  if (event.eventCategory === "parent_restructuring") return "Parent restructuring";
  return "Acquisition / rename";
}

export function eventRemainingQuestions(event: StructuralEvent): string[] {
  const questions: string[] = [];
  if (event.ccnAtEvent == null) {
    questions.push("Event-time CCN and legal entity are unknown.");
  }
  if (event.buyer == null) questions.push("Buyer is unknown.");
  if (event.seller == null && event.eventCategory === "acquisition") questions.push("Seller is unknown.");
  if (event.announcementDate == null) questions.push("Announcement date is unknown.");
  if (event.effectiveDate == null) questions.push("Effective date is unknown.");
  if (event.sources.some((source) => source.publicationDate == null)) {
    questions.push("At least one source publication date is unknown, so pre-event availability is not established.");
  }
  if (event.eventCategory === "property_transaction") {
    questions.push("A property sale does not establish a verified provider CHOW.");
  }
  if (event.eventCategory === "parent_bankruptcy" || event.eventCategory === "parent_restructuring") {
    questions.push("A parent event does not establish a verified facility bankruptcy, CHOW, or closure.");
  }
  if (event.eventCategory === "acquisition") {
    questions.push("An acquisition does not establish prior financial distress.");
  }
  return questions;
}

export function unknownField(value: string | null | undefined): string {
  return value && value.trim() ? value : "Unknown / requires verification";
}
