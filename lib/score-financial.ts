import { scoringConfig } from "./scoring-config.ts";
import type {
  ConfidenceLevel,
  FinancialDistressResult,
  FinancialStatus,
  Hospital,
  ScoreFactor,
} from "../src/types.ts";

type FactorConfig = (typeof scoringConfig.factors)[keyof typeof scoringConfig.factors];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function isPresent(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function linearRisk(value: number, factor: FactorConfig): number {
  const { healthy, concern, direction } = factor;
  if (direction === "lower_is_riskier") {
    if (value >= healthy) return 0;
    if (value <= concern) return 100;
    return (100 * (healthy - value)) / (healthy - concern);
  }
  if (value <= healthy) return 0;
  if (value >= concern) return 100;
  return (100 * (value - healthy)) / (concern - healthy);
}

function statusForScore(score: number): FinancialStatus {
  if (score <= scoringConfig.statusThresholds.stableMax) return "Stable";
  if (score <= scoringConfig.statusThresholds.watchMax) return "Watch";
  return "High Concern";
}

function confidenceForCount(available: number): ConfidenceLevel {
  if (available >= scoringConfig.confidence.highMinAvailable) return "High";
  if (available >= scoringConfig.confidence.moderateMinAvailable) return "Moderate";
  return "Low";
}

function factorReason(id: string, available: boolean, rawValue: number | null, risk: number | null): string {
  if (!available || rawValue === null || risk === null) {
    return "Not available in current dataset";
  }
  switch (id) {
    case "operating_margin":
      if (rawValue < 0) {
        return "Operating expenses exceeded available operating revenue, increasing the hospital's financial stress score.";
      }
      if (risk >= 50) {
        return "Reported operating margin is thin relative to the configured healthy band.";
      }
      return "Reported operating margin is within or near the configured healthy band.";
    case "expense_pressure":
      if (rawValue > 1) {
        return "Reported costs exceeded reported revenues, adding expense pressure.";
      }
      return "Reported costs are being compared to reported revenues from the same HCRIS summary.";
    case "leverage":
      if (rawValue >= 0.7) {
        return "Liabilities represent a high proportion of reported assets.";
      }
      return "Liabilities are being compared to reported assets from the same HCRIS summary.";
    case "current_ratio":
      return "Current assets relative to current liabilities measure short-term liquidity.";
    case "liquidity":
      return "Cash relative to annual operating expenses is a simple liquidity screen.";
    case "patient_volume":
      if (risk >= 50) {
        return "Inpatient utilization is low relative to available bed-days, adding volume pressure.";
      }
      return "Inpatient days are being compared to available bed-days from the same cost-report summary.";
    default:
      return "Factor evaluated from available cost-report fields.";
  }
}

function buildFactor(
  config: FactorConfig,
  rawValue: number | null,
  source: string,
  unavailableReason?: string,
): ScoreFactor {
  const available = isPresent(rawValue) && !unavailableReason;
  const normalizedRisk = available ? clamp(linearRisk(rawValue, config), 0, 100) : null;
  return {
    metric: config.label,
    rawValue: available ? rawValue : rawValue,
    normalizedRisk,
    weight: config.weight,
    reason: unavailableReason ?? factorReason(config.id, available, rawValue, normalizedRisk),
    source,
    available,
  };
}

/**
 * Transparent 0–100 financial stress score.
 * Missing inputs are omitted and weights are renormalized. Nulls are never treated as zero.
 */
export function scoreFinancialDistress(hospital: Hospital): FinancialDistressResult {
  const { financials, sourceFieldMap } = hospital;
  const limitations: string[] = [
    "Experimental hackathon score, not a validated bankruptcy or closure predictor.",
    "Thresholds live in lib/scoring-config.ts and can be changed without editing the UI.",
    "Only metrics present in this extract are used; absent metrics stay missing.",
  ];

  const expensePressure =
    isPresent(financials.operatingExpenses) && isPresent(financials.operatingRevenue) && financials.operatingRevenue !== 0
      ? financials.operatingExpenses / financials.operatingRevenue
      : null;

  const leverageRaw =
    isPresent(financials.totalLiabilities) && isPresent(financials.totalAssets) && financials.totalAssets > 0
      ? financials.totalLiabilities / financials.totalAssets
      : null;
  const leverageBlocked =
    isPresent(financials.totalLiabilities) && financials.totalLiabilities < 0
      ? "Published total liabilities are negative, so the liabilities-to-assets ratio is not interpretable and was not scored."
      : undefined;

  const currentRatio =
    isPresent(financials.currentAssets) &&
    isPresent(financials.currentLiabilities) &&
    financials.currentLiabilities !== 0
      ? financials.currentAssets / financials.currentLiabilities
      : null;

  const liquidity =
    isPresent(financials.cash) && isPresent(financials.operatingExpenses) && financials.operatingExpenses > 0
      ? financials.cash / financials.operatingExpenses
      : null;

  const occupancyDenominator = isPresent(financials.bedDaysAvailable)
    ? financials.bedDaysAvailable
    : isPresent(financials.availableBeds)
      ? financials.availableBeds * 365
      : null;
  const volume =
    isPresent(financials.inpatientDays) && isPresent(occupancyDenominator) && occupancyDenominator > 0
      ? financials.inpatientDays / occupancyDenominator
      : null;

  const factors: ScoreFactor[] = [
    buildFactor(
      scoringConfig.factors.operatingMargin,
      financials.operatingMargin,
      sourceFieldMap.operatingMargin ?? "operating_margin",
    ),
    buildFactor(
      scoringConfig.factors.expensePressure,
      expensePressure,
      sourceFieldMap.operatingExpenses && sourceFieldMap.operatingRevenue
        ? `${sourceFieldMap.operatingExpenses} / ${sourceFieldMap.operatingRevenue}`
        : "operating_expenses / operating_revenue",
    ),
    buildFactor(
      scoringConfig.factors.leverage,
      leverageBlocked ? financials.totalLiabilities : leverageRaw,
      sourceFieldMap.totalLiabilities && sourceFieldMap.totalAssets
        ? `${sourceFieldMap.totalLiabilities} / ${sourceFieldMap.totalAssets}`
        : "total_liabilities / total_assets",
      leverageBlocked,
    ),
    buildFactor(
      scoringConfig.factors.currentRatio,
      currentRatio,
      sourceFieldMap.currentAssets && sourceFieldMap.currentLiabilities
        ? `${sourceFieldMap.currentAssets} / ${sourceFieldMap.currentLiabilities}`
        : "current_assets / current_liabilities",
    ),
    buildFactor(
      scoringConfig.factors.liquidity,
      liquidity,
      sourceFieldMap.cash && sourceFieldMap.operatingExpenses
        ? `${sourceFieldMap.cash} / ${sourceFieldMap.operatingExpenses}`
        : "cash / operating_expenses",
    ),
    buildFactor(
      scoringConfig.factors.volume,
      volume,
      sourceFieldMap.inpatientDays && (sourceFieldMap.bedDaysAvailable ?? sourceFieldMap.availableBeds)
        ? `${sourceFieldMap.inpatientDays} / ${sourceFieldMap.bedDaysAvailable ?? sourceFieldMap.availableBeds}`
        : "inpatient_days / bed_days_available",
    ),
  ];

  const available = factors.filter((factor) => factor.available && factor.normalizedRisk !== null);
  const missingInputs = factors.filter((factor) => !factor.available).map((factor) => factor.metric);
  const weightSum = available.reduce((sum, factor) => sum + factor.weight, 0);

  let score = 0;
  if (weightSum > 0) {
    score = available.reduce((sum, factor) => {
      return sum + ((factor.normalizedRisk as number) * factor.weight) / weightSum;
    }, 0);
  } else {
    limitations.push("No scorable financial metrics were present, so the score is 0 with no implied stability.");
  }

  score = Math.round(clamp(score, 0, 100));

  return {
    score,
    status: statusForScore(score),
    confidence: confidenceForCount(available.length),
    factors,
    missingInputs,
    limitations,
  };
}

export function flaggedExplanations(result: FinancialDistressResult): string[] {
  return result.factors
    .filter((factor) => factor.available && (factor.normalizedRisk ?? 0) >= 50)
    .map((factor) => factor.reason);
}
