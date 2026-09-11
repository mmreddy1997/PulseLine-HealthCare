import type {
  FinancialDistressResult,
  PulseLineSignal,
  WorkforceSignal,
} from "../src/types.ts";

/**
 * Combined PulseLine signal. Financial stress alone does not trigger it.
 * Missing workforce evidence is treated as missing, not as a negative finding.
 */
export function buildPulseLineSignal(
  financial: FinancialDistressResult,
  workforce: WorkforceSignal,
): PulseLineSignal {
  const availableSignals: string[] = ["financial_distress"];
  const missingSignals: string[] = [];
  const limitations = [
    "PulseLine's combined early-warning signal requires more than one independent evidence stream.",
    "Absence of workforce data is not evidence that the workforce is stable.",
  ];

  if (workforce.status === "not_available") {
    missingSignals.push("workforce_instability");
  } else {
    availableSignals.push("workforce_instability");
  }

  if (workforce.status === "not_available" && financial.status === "High Concern") {
    return {
      triggered: false,
      severity: "insufficient_evidence",
      reasons: [
        "Financial distress is elevated, but longitudinal workforce evidence is not yet available to confirm multi-signal deterioration.",
      ],
      availableSignals,
      missingSignals,
      limitations,
    };
  }

  if (workforce.status === "not_available") {
    return {
      triggered: false,
      severity: "not_triggered",
      reasons: [
        "Financial stress is visible, but PulseLine requires longitudinal workforce evidence before triggering its combined early-warning signal.",
      ],
      availableSignals,
      missingSignals,
      limitations,
    };
  }

  return {
    triggered: false,
    severity: "not_triggered",
    reasons: ["Workforce evidence is present in architecture only; no real NPPES comparison has been run."],
    availableSignals,
    missingSignals,
    limitations,
  };
}
