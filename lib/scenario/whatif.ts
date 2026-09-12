import { parseCmsNumeric } from "../adapt-research.ts";
import type { HospitalView } from "../../src/types.ts";

export const SCENARIO_LIMIT =
  "Illustrative scenario—not a forecast. This is a simplified patient-service scenario measure. It is not overall operating income, net income, cash flow, or a closure forecast.";

export const MIN_CHANGE_PCT = -95;
export const MAX_CHANGE_PCT = 400;

export interface ScenarioInputs {
  revenueChangePct: number;
  expenseChangePct: number;
}

export interface ScenarioResult {
  enabled: boolean;
  disabledReason: string | null;
  hospitalId: string;
  hospitalName: string;
  reportId: string | null;
  baselinePeriod: string | null;
  baselineRevenue: number | null;
  baselineExpenses: number | null;
  publishedPatientServiceResult: number | null;
  computedBaselineBalance: number | null;
  reconciled: boolean;
  inputs: ScenarioInputs;
  scenarioRevenue: number | null;
  scenarioExpenses: number | null;
  scenarioBalance: number | null;
  baselineBalance: number | null;
  balanceChange: number | null;
  revenueToEqualExpenses: number | null;
  requiredRevenueChangePct: number | null;
  formulas: string[];
  sources: { label: string; url: string | null; reportId: string | null }[];
}

function periodLabel(view: HospitalView): string {
  const start = view.hospital.fiscalYearStart;
  return start ? `${start} to ${view.hospital.fiscalYearEnd}` : `Ending ${view.hospital.fiscalYearEnd}`;
}

export function clampChangePct(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(MAX_CHANGE_PCT, Math.max(MIN_CHANGE_PCT, value));
}

export function scenarioFromPercents(
  baselineRevenue: number,
  baselineExpenses: number,
  revenueChangePct: number,
  expenseChangePct: number,
) {
  const scenarioRevenue = (baselineRevenue * (100 + revenueChangePct)) / 100;
  const scenarioExpenses = (baselineExpenses * (100 + expenseChangePct)) / 100;
  const scenarioBalance = scenarioRevenue - scenarioExpenses;
  const baselineBalance = baselineRevenue - baselineExpenses;
  const requiredRevenueChangePct =
    baselineRevenue === 0 ? null : ((scenarioExpenses - baselineRevenue) / Math.abs(baselineRevenue)) * 100;
  return {
    scenarioRevenue,
    scenarioExpenses,
    scenarioBalance,
    baselineBalance,
    balanceChange: scenarioBalance - baselineBalance,
    revenueToEqualExpenses: scenarioExpenses,
    requiredRevenueChangePct,
  };
}

export function evaluateScenario(
  view: HospitalView | null,
  inputs: ScenarioInputs,
  options?: { hospitalName?: string; pending?: boolean },
): ScenarioResult {
  const empty: ScenarioResult = {
    enabled: false,
    disabledReason: options?.pending
      ? "What-if is unavailable while financial data is pending. PulseLine does not invent a baseline."
      : "What-if needs a selected fiscal report with Net Patient Revenue and Less Total Operating Expense.",
    hospitalId: view?.hospital.hospitalId ?? "",
    hospitalName: options?.hospitalName ?? view?.hospital.name ?? "",
    reportId: view?.hospital.reportRecordId ?? null,
    baselinePeriod: view ? periodLabel(view) : null,
    baselineRevenue: null,
    baselineExpenses: null,
    publishedPatientServiceResult: null,
    computedBaselineBalance: null,
    reconciled: false,
    inputs: { revenueChangePct: 0, expenseChangePct: 0 },
    scenarioRevenue: null,
    scenarioExpenses: null,
    scenarioBalance: null,
    baselineBalance: null,
    balanceChange: null,
    revenueToEqualExpenses: null,
    requiredRevenueChangePct: null,
    formulas: [
      "scenarioRevenue = baselineRevenue × (1 + revenueChangePct / 100)",
      "scenarioExpenses = baselineExpenses × (1 + expenseChangePct / 100)",
      "baselineBalance = baselineRevenue − baselineExpenses",
      "scenarioBalance = scenarioRevenue − scenarioExpenses",
      "balanceChange = scenarioBalance − baselineBalance",
    ],
    sources: [],
  };

  if (!view || options?.pending) return empty;

  const revenue = view.hospital.financials.netPatientRevenue;
  const expenses = view.hospital.financials.operatingExpenses;
  const published = parseCmsNumeric(view.hospital.sourceFields["Net Income from Service to Patients"], "income");
  const publishedValue = published.error ? null : published.value;
  empty.baselineRevenue = revenue;
  empty.baselineExpenses = expenses;
  empty.publishedPatientServiceResult = publishedValue;
  empty.hospitalId = view.hospital.hospitalId;
  empty.hospitalName = view.hospital.name;
  empty.baselinePeriod = periodLabel(view);
  empty.reportId = view.hospital.reportRecordId;
  empty.sources = [
    {
      label: view.hospital.sourceId ?? "CMS cost report",
      url: view.hospital.sourceUrl,
      reportId: view.hospital.reportRecordId,
    },
  ];

  if (revenue === null || expenses === null) {
    return { ...empty, disabledReason: "This report is missing Net Patient Revenue or Less Total Operating Expense." };
  }

  const computed = revenue - expenses;
  empty.computedBaselineBalance = computed;
  const reconciled = publishedValue === null || Math.abs(publishedValue - computed) <= 1;
  if (!reconciled) {
    return {
      ...empty,
      reconciled: false,
      disabledReason:
        "The published Net Income from Service to Patients does not equal Net Patient Revenue minus Less Total Operating Expense. PulseLine will not assume they are the same.",
    };
  }

  const revenueChangePct = clampChangePct(inputs.revenueChangePct);
  const expenseChangePct = clampChangePct(inputs.expenseChangePct);
  const next = scenarioFromPercents(revenue, expenses, revenueChangePct, expenseChangePct);
  if (![next.scenarioRevenue, next.scenarioExpenses, next.scenarioBalance].every(Number.isFinite)) {
    return { ...empty, reconciled: true, disabledReason: "Those percentage inputs produce a non-finite scenario value." };
  }

  return {
    ...empty,
    enabled: true,
    disabledReason: null,
    reconciled: true,
    inputs: { revenueChangePct, expenseChangePct },
    scenarioRevenue: next.scenarioRevenue,
    scenarioExpenses: next.scenarioExpenses,
    scenarioBalance: next.scenarioBalance,
    baselineBalance: next.baselineBalance,
    balanceChange: next.balanceChange,
    revenueToEqualExpenses: next.revenueToEqualExpenses,
    requiredRevenueChangePct: next.requiredRevenueChangePct,
  };
}

export function resetScenarioInputs(): ScenarioInputs {
  return { revenueChangePct: 0, expenseChangePct: 0 };
}
