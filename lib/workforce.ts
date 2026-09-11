import type { WorkforceSignal } from "../src/types.ts";

/**
 * Architecture placeholder. Do not fabricate NPPES migration data.
 */
export function buildWorkforceSignal(): WorkforceSignal {
  return {
    status: "not_available",
    summary: "Longitudinal workforce signal pending NPPES snapshot integration.",
    explanation:
      "PulseLine will compare historical NPPES snapshots to investigate specialist practice-location changes. NPPES does not establish hospital employment, and a practice-location change does not necessarily indicate a physician departure.",
  };
}
