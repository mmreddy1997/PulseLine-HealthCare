import type { AskContext, AskIntent } from "./types.ts";

export interface SuggestedQuestion {
  id: string;
  intent: AskIntent;
  label: string;
  question: string;
}

export function suggestedQuestions(context: AskContext): SuggestedQuestion[] {
  const scored = context.kind === "scored" && context.selectedReport !== null;
  const items: SuggestedQuestion[] = [];

  if (scored) {
    items.push({
      id: "why_score",
      intent: "why_score",
      label: "Explain the score",
      question: "Why did this hospital receive this score?",
    });
    items.push({
      id: "npr",
      intent: "net_patient_revenue",
      label: "Net patient revenue",
      question: "What was net patient revenue for this fiscal period?",
    });
    if (context.reports.length > 1) {
      items.push({
        id: "npr_change",
        intent: "revenue_change",
        label: "How revenue changed",
        question: "How did revenue change from the previous comparable report?",
      });
    }
  }

  items.push({
    id: "missing",
    intent: "missing_excluded",
    label: "What is missing?",
    question: "What information is missing or excluded?",
  });
  items.push({
    id: "events",
    intent: "structural_events",
    label: "Documented events",
    question: "What documented events relate to this hospital?",
  });
  items.push({
    id: "community",
    intent: "community_context",
    label: "Community context",
    question: "What community context is available?",
  });

  return items;
}
