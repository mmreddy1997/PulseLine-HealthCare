import type { HospitalView } from "../src/types.ts";

/** Evidence-based follow-ups. Advice refers only to factors that exist on this view. */
export function investigationNextSteps(view: HospitalView): string[] {
  const steps: string[] = [];
  const { hospital, financial } = view;
  const factors = new Map(financial.factors.map((factor) => [factor.id, factor]));
  const available = financial.factors.filter((factor) => factor.availability === "available");

  if (financial.status === "Insufficient data") {
    steps.push("Do not treat this hospital as financially stable. Obtain a cost-report extract with scorable fields first.");
  }

  if (available.length > 0 && (financial.status === "High Concern" || financial.status === "Watch")) {
    steps.push(`Reconstruct the flagged score from the available factors only: ${available.map((factor) => factor.metric).join(", ")}.`);
  }

  const operatingMargin = factors.get("operating_margin");
  if (operatingMargin?.availability === "available") {
    steps.push("Compare the published operating-margin figure to CMS-2552 worksheet G-3 operating lines in an official extract.");
  } else if (operatingMargin?.availability === "unsupported") {
    steps.push("Overall operating margin is not calculated. Do not treat the patient-service result as a validated operating margin.");
  }

  const expensePressure = factors.get("expense_pressure");
  if (expensePressure?.availability === "available") {
    steps.push("Review patient-service expense pressure from Less Total Operating Expense / Net Patient Revenue for this fiscal report.");
  } else if (expensePressure?.availability === "unsupported") {
    steps.push("Do not infer operating expense pressure from total revenues and total costs until operating lines are present.");
  }

  const leverage = factors.get("leverage");
  if (leverage?.availability === "invalid") {
    steps.push("Ask the source why total liabilities are uninterpretable; do not invert or absolute-value the published figure.");
  }

  const currentRatio = factors.get("current_ratio");
  if (currentRatio?.availability === "invalid") {
    steps.push("Current ratio was excluded because current liabilities are uninterpretable. Preserve the published balance.");
  } else if (currentRatio?.availability === "unavailable") {
    steps.push("Current-ratio screening remains unknown until current assets and current liabilities are available.");
  }

  const liquidity = factors.get("liquidity");
  if (liquidity?.availability === "available") {
    if (liquidity.rawValue !== null && Math.abs(liquidity.rawValue) > 0 && Math.abs(liquidity.rawValue) < 0.01) {
      steps.push("Cash/liquidity is a very small valid ratio, not a missing or zero value.");
    }
  } else if (liquidity?.availability === "invalid") {
    steps.push("Liquidity was excluded because cash or expenses cannot support a ratio. Preserve the published cash balance.");
  } else if (liquidity?.availability === "unavailable") {
    steps.push("Liquidity remains unknown until cash and operating-expense lines are available.");
  }

  if (hospital.dataQuality.addressMismatch) {
    steps.push(
      "Resolve the street-address discrepancy before using this record as a stable facility identity. An address mismatch is not a workforce change.",
    );
  }
  if (hospital.fiscalYearStart === null) {
    steps.push("Fiscal period start is unknown; do not assume a 365-day year from the end date.");
  }
  steps.push("Workforce instability remains pending historical NPPES snapshots. Do not treat the absence as stability.");
  steps.push("Five-domain research, pre-event panels, and matched controls remain pending. Do not treat the timeline as a forecast.");
  return steps;
}
