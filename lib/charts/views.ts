import type { HospitalView } from "../../src/types.ts";
import {
  currentRatioSeries,
  moneySeries,
  publishedResultSeries,
  type ChartSeries,
} from "./series.ts";

export const FINANCIAL_VIEW_IDS = [
  "npr_expenses",
  "patient_service_result",
  "cash_liquidity",
  "assets_liabilities",
  "current_ratio",
] as const;

export type FinancialViewId = (typeof FINANCIAL_VIEW_IDS)[number];

export interface FinancialViewOption {
  id: FinancialViewId;
  label: string;
  chartKind: "grouped_usd" | "signed_usd" | "split_units" | "ratio";
  unitNote: string;
  definition: string;
}

export const FINANCIAL_VIEW_OPTIONS: FinancialViewOption[] = [
  {
    id: "npr_expenses",
    label: "Revenue and patient-service expenses",
    chartKind: "grouped_usd",
    unitNote: "USD",
    definition: "CMS Net Patient Revenue and Less Total Operating Expense. Not total hospital revenue.",
  },
  {
    id: "patient_service_result",
    label: "Patient-service result",
    chartKind: "signed_usd",
    unitNote: "USD",
    definition: "Published CMS Net Income from Service to Patients. Not overall operating margin or cash flow.",
  },
  {
    id: "cash_liquidity",
    label: "Cash and liquidity",
    chartKind: "split_units",
    unitNote: "USD and ratio, shown separately",
    definition: "Cash on Hand and in Banks, then current ratio. Units are not mixed on one axis.",
  },
  {
    id: "assets_liabilities",
    label: "Assets and liabilities",
    chartKind: "grouped_usd",
    unitNote: "USD",
    definition: "CMS Total Assets and Total Liabilities. Negative published values are preserved.",
  },
  {
    id: "current_ratio",
    label: "Current ratio",
    chartKind: "ratio",
    unitNote: "Ratio",
    definition: "Current assets / current liabilities. Excluded when current liabilities are ≤ 0.",
  },
];

export function filterReportsByRange(reports: HospitalView[], startEnd: string | null, endEnd: string | null): HospitalView[] {
  return reports.filter((report) => {
    const end = report.hospital.fiscalYearEnd;
    if (startEnd && end < startEnd) return false;
    if (endEnd && end > endEnd) return false;
    return true;
  });
}

export function seriesForView(id: FinancialViewId, reports: HospitalView[]): { primary: ChartSeries; secondary: ChartSeries | null } {
  if (id === "npr_expenses") {
    return {
      primary: moneySeries(
        reports,
        "npr_expenses",
        "Net patient revenue",
        "How did net patient revenue and patient-service expenses compare across reports?",
        "CMS Net Patient Revenue. Not total hospital revenue.",
        (report) => report.hospital.financials.netPatientRevenue,
      ),
      secondary: moneySeries(
        reports,
        "operating_expenses",
        "Patient-service expenses",
        "How did Less Total Operating Expense change across reports?",
        "CMS Less Total Operating Expense.",
        (report) => report.hospital.financials.operatingExpenses,
      ),
    };
  }
  if (id === "patient_service_result") {
    return { primary: publishedResultSeries(reports), secondary: null };
  }
  if (id === "cash_liquidity") {
    return {
      primary: moneySeries(
        reports,
        "cash",
        "Cash on hand",
        "How did cash change across reports?",
        "CMS Cash on Hand and in Banks. Negative balances are preserved.",
        (report) => report.hospital.financials.cash,
      ),
      secondary: currentRatioSeries(reports),
    };
  }
  if (id === "assets_liabilities") {
    return {
      primary: moneySeries(
        reports,
        "assets",
        "Total assets",
        "How did reported assets change across reports?",
        "CMS Total Assets.",
        (report) => report.hospital.financials.totalAssets,
      ),
      secondary: moneySeries(
        reports,
        "liabilities",
        "Total liabilities",
        "How did reported liabilities change across reports?",
        "CMS Total Liabilities. Negative published values are preserved.",
        (report) => report.hospital.financials.totalLiabilities,
      ),
    };
  }
  return { primary: currentRatioSeries(reports), secondary: null };
}

export function viewHasValues(id: FinancialViewId, reports: HospitalView[]): boolean {
  const { primary, secondary } = seriesForView(id, reports);
  const points = [...primary.points, ...(secondary?.points ?? [])];
  return points.some((point) => point.value !== null && !point.excluded);
}
