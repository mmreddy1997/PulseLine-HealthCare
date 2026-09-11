/**
 * Experimental hackathon thresholds for PulseLine financial stress.
 * UI labels, bands, and factor copy are generated from this file.
 */

export const scoringConfig = {
  statusThresholds: {
    /** Inclusive upper bound for Stable. */
    stableMax: 39,
    /** Inclusive upper bound for Watch. Above this is High Concern. */
    watchMax: 69,
  },
  statusLabels: {
    Stable: "Stable",
    Watch: "Watch",
    "High Concern": "High Concern",
    "Insufficient data": "Insufficient data",
  },
  dataCoverage: {
    highMinAvailable: 5,
    moderateMinAvailable: 3,
  },
  rounding: "Nearest integer via Math.round after a weight-renormalized average of available factor risks. The score is null when no factor can be scored.",
  correlatedFactorGroups: [
    {
      ids: ["operating_margin", "expense_pressure"],
      note: "A validated overall operating margin is not calculated. Patient-service expense pressure uses Net Patient Revenue and Less Total Operating Expense only.",
    },
  ],
  /**
   * Linear risk ramps. Values at or beyond `healthy` score 0 risk;
   * values at or beyond `concern` score 100. Weights are renormalized
   * across factors that are actually scored.
   */
  factors: {
    operatingMargin: {
      id: "operating_margin",
      label: "Operating Margin",
      formula: "not calculated — patient-care result is not a validated overall operating margin",
      weight: 0.28,
      direction: "lower_is_riskier" as const,
      healthy: 0.08,
      concern: -0.12,
    },
    expensePressure: {
      id: "expense_pressure",
      label: "Patient-service expense pressure",
      formula: "Less Total Operating Expense / Net Patient Revenue",
      weight: 0.18,
      direction: "higher_is_riskier" as const,
      healthy: 0.92,
      concern: 1.2,
    },
    leverage: {
      id: "leverage",
      label: "Liabilities / Assets",
      formula: "totalLiabilities / totalAssets",
      weight: 0.22,
      direction: "higher_is_riskier" as const,
      healthy: 0.4,
      concern: 1.0,
    },
    currentRatio: {
      id: "current_ratio",
      label: "Current Ratio",
      formula: "currentAssets / currentLiabilities",
      weight: 0.12,
      direction: "lower_is_riskier" as const,
      healthy: 2.0,
      concern: 0.8,
    },
    liquidity: {
      id: "liquidity",
      label: "Cash / Liquidity",
      formula: "cash / operatingExpenses",
      weight: 0.1,
      direction: "lower_is_riskier" as const,
      healthy: 0.15,
      concern: 0.03,
    },
    volume: {
      id: "patient_volume",
      label: "Patient Volume",
      formula: "inpatientDays / bedDaysAvailable",
      weight: 0.1,
      direction: "lower_is_riskier" as const,
      healthy: 0.45,
      concern: 0.15,
    },
  },
} as const;

export type ScoringConfig = typeof scoringConfig;
