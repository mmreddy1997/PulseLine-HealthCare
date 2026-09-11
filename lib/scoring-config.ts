/**
 * Experimental hackathon thresholds for PulseLine financial stress.
 * Keep these here — UI components must not hardcode bands or cutoffs.
 */

export const scoringConfig = {
  statusThresholds: {
    /** Inclusive upper bound for Stable. */
    stableMax: 39,
    /** Inclusive upper bound for Watch. Above this is High Concern. */
    watchMax: 69,
  },
  confidence: {
    highMinAvailable: 5,
    moderateMinAvailable: 3,
  },
  /**
   * Linear risk ramps. Values at or beyond `healthy` score 0 risk;
   * values at or beyond `concern` score 100. Weights are renormalized
   * across factors that are actually present.
   */
  factors: {
    operatingMargin: {
      id: "operating_margin",
      label: "Operating Margin",
      weight: 0.28,
      direction: "lower_is_riskier" as const,
      healthy: 0.08,
      concern: -0.12,
    },
    expensePressure: {
      id: "expense_pressure",
      label: "Revenue / Expense Pressure",
      weight: 0.18,
      direction: "higher_is_riskier" as const,
      healthy: 0.92,
      concern: 1.2,
    },
    leverage: {
      id: "leverage",
      label: "Liabilities / Assets",
      weight: 0.22,
      direction: "higher_is_riskier" as const,
      healthy: 0.4,
      concern: 1.0,
    },
    currentRatio: {
      id: "current_ratio",
      label: "Current Ratio",
      weight: 0.12,
      direction: "lower_is_riskier" as const,
      healthy: 2.0,
      concern: 0.8,
    },
    liquidity: {
      id: "liquidity",
      label: "Cash / Liquidity",
      weight: 0.1,
      direction: "lower_is_riskier" as const,
      healthy: 0.15,
      concern: 0.03,
    },
    volume: {
      id: "patient_volume",
      label: "Patient Volume",
      weight: 0.1,
      direction: "lower_is_riskier" as const,
      healthy: 0.45,
      concern: 0.15,
    },
  },
} as const;

export type ScoringConfig = typeof scoringConfig;
