import { parseCmsNumeric } from "../adapt-research.ts";
import type { Hospital, HospitalView } from "../../src/types.ts";

export const MEASURE_ORIGIN = ["source_reported", "calculated"] as const;
export type MeasureOrigin = (typeof MEASURE_ORIGIN)[number];

export const MEASURE_UNITS = ["usd", "ratio", "percent", "days", "count"] as const;
export type MeasureUnit = (typeof MEASURE_UNITS)[number];

export const MEASURE_GROUPS = [
  "patient_service",
  "balance_sheet",
  "liquidity",
  "operational",
] as const;
export type MeasureGroup = (typeof MEASURE_GROUPS)[number];

export interface MeasureDefinition {
  id: string;
  label: string;
  group: MeasureGroup;
  unit: MeasureUnit;
  origin: MeasureOrigin;
  cmsField: string | null;
  definition: string;
  not: string;
}

export const MEASURES = {
  net_patient_revenue: {
    id: "net_patient_revenue",
    label: "Net patient revenue",
    group: "patient_service",
    unit: "usd",
    origin: "source_reported",
    cmsField: "Net Patient Revenue",
    definition: "CMS Net Patient Revenue for the fiscal report. Dollar amounts are as published.",
    not: "Not total hospital revenue and not a valuation input.",
  },
  patient_service_expenses: {
    id: "patient_service_expenses",
    label: "Patient-service expenses",
    group: "patient_service",
    unit: "usd",
    origin: "source_reported",
    cmsField: "Less Total Operating Expense",
    definition: "CMS Less Total Operating Expense for the fiscal report.",
    not: "Not a validated overall operating-cost total and not cash outflow.",
  },
  published_patient_service_result: {
    id: "published_patient_service_result",
    label: "Published patient-service result",
    group: "patient_service",
    unit: "usd",
    origin: "source_reported",
    cmsField: "Net Income from Service to Patients",
    definition: "CMS Net Income from Service to Patients, as published.",
    not: "Not overall operating income, net income, or cash flow.",
  },
  derived_patient_service_balance: {
    id: "derived_patient_service_balance",
    label: "Derived patient-service balance",
    group: "patient_service",
    unit: "usd",
    origin: "calculated",
    cmsField: null,
    definition: "Net Patient Revenue minus Less Total Operating Expense.",
    not: "Not overall operating profit, net income, or cash flow. Shown separately from the published result.",
  },
  patient_service_result_ratio: {
    id: "patient_service_result_ratio",
    label: "Patient-service result",
    group: "patient_service",
    unit: "percent",
    origin: "calculated",
    cmsField: null,
    definition: "Published Net Income from Service to Patients divided by Net Patient Revenue.",
    not: "Not a validated overall operating margin.",
  },
  total_assets: {
    id: "total_assets",
    label: "Total assets",
    group: "balance_sheet",
    unit: "usd",
    origin: "source_reported",
    cmsField: "Total Assets",
    definition: "CMS Total Assets.",
    not: "Not enterprise value.",
  },
  total_liabilities: {
    id: "total_liabilities",
    label: "Total liabilities",
    group: "balance_sheet",
    unit: "usd",
    origin: "source_reported",
    cmsField: "Total Liabilities",
    definition: "CMS Total Liabilities. Negative published values are preserved.",
    not: "Not synonymous with borrowing or debt capacity.",
  },
  current_assets: {
    id: "current_assets",
    label: "Current assets",
    group: "balance_sheet",
    unit: "usd",
    origin: "source_reported",
    cmsField: "Total Current Assets",
    definition: "CMS Total Current Assets.",
    not: "Not cash runway.",
  },
  current_liabilities: {
    id: "current_liabilities",
    label: "Current liabilities",
    group: "balance_sheet",
    unit: "usd",
    origin: "source_reported",
    cmsField: "Total Current Liabilities",
    definition: "CMS Total Current Liabilities. Negative published values are preserved.",
    not: "Not a complete debt schedule.",
  },
  cash: {
    id: "cash",
    label: "Cash",
    group: "liquidity",
    unit: "usd",
    origin: "source_reported",
    cmsField: "Cash on Hand and in Banks",
    definition: "CMS Cash on Hand and in Banks. Negative balances are preserved.",
    not: "Not restricted-cash verified and not a cash-runway estimate.",
  },
  current_ratio: {
    id: "current_ratio",
    label: "Current ratio",
    group: "liquidity",
    unit: "ratio",
    origin: "calculated",
    cmsField: null,
    definition: "Total Current Assets divided by Total Current Liabilities.",
    not: "Excluded when current liabilities are missing or ≤ 0. Not creditworthiness.",
  },
  liabilities_to_assets: {
    id: "liabilities_to_assets",
    label: "Liabilities / assets",
    group: "liquidity",
    unit: "ratio",
    origin: "calculated",
    cmsField: null,
    definition: "Total Liabilities divided by Total Assets.",
    not: "Excluded when assets are missing, ≤ 0, or liabilities are uninterpretable.",
  },
  inpatient_days: {
    id: "inpatient_days",
    label: "Inpatient days",
    group: "operational",
    unit: "days",
    origin: "source_reported",
    cmsField: "Total Days (V + XVIII + XIX + Unknown)",
    definition: "CMS Total Days for the fiscal report.",
    not: "Not Kentucky calendar-year utilization and not a financial result.",
  },
  bed_days_available: {
    id: "bed_days_available",
    label: "Bed days available",
    group: "operational",
    unit: "days",
    origin: "source_reported",
    cmsField: "Total Bed Days Available",
    definition: "CMS Total Bed Days Available for the fiscal report.",
    not: "Not a financial result.",
  },
  inpatient_utilization: {
    id: "inpatient_utilization",
    label: "Inpatient utilization",
    group: "operational",
    unit: "percent",
    origin: "calculated",
    cmsField: null,
    definition: "Total Days divided by Total Bed Days Available.",
    not: "Operational only. Not a financial result and not Kentucky calendar-year utilization.",
  },
} as const satisfies Record<string, MeasureDefinition>;

export type MeasureId = keyof typeof MEASURES;

export interface MeasureValue {
  id: MeasureId;
  value: number | null;
  excluded: boolean;
  exclusion: string | null;
  origin: MeasureOrigin;
}

export function publishedPatientServiceResult(hospital: Hospital): { value: number | null; error: boolean } {
  const parsed = parseCmsNumeric(hospital.sourceFields["Net Income from Service to Patients"], "income");
  return { value: parsed.error ? null : parsed.value, error: Boolean(parsed.error) };
}

export function derivedPatientServiceBalance(hospital: Hospital): number | null {
  const revenue = hospital.financials.netPatientRevenue;
  const expenses = hospital.financials.operatingExpenses;
  if (revenue === null || expenses === null) return null;
  return revenue - expenses;
}

export function patientServiceResultRatio(hospital: Hospital): MeasureValue {
  const published = publishedPatientServiceResult(hospital);
  const npr = hospital.financials.netPatientRevenue;
  if (published.error || published.value === null || npr === null) {
    return {
      id: "patient_service_result_ratio",
      value: null,
      excluded: false,
      exclusion: "Not calculated from this report.",
      origin: "calculated",
    };
  }
  if (npr === 0) {
    return {
      id: "patient_service_result_ratio",
      value: null,
      excluded: true,
      exclusion: "Excluded: Net Patient Revenue is zero, so the ratio is not interpretable.",
      origin: "calculated",
    };
  }
  return {
    id: "patient_service_result_ratio",
    value: published.value / npr,
    excluded: false,
    exclusion: null,
    origin: "calculated",
  };
}

export function currentRatioValue(hospital: Hospital): MeasureValue {
  const assets = hospital.financials.currentAssets;
  const liabilities = hospital.financials.currentLiabilities;
  if (assets === null || liabilities === null) {
    return {
      id: "current_ratio",
      value: null,
      excluded: false,
      exclusion: "Missing in this report. Missing is not zero.",
      origin: "calculated",
    };
  }
  if (liabilities <= 0) {
    return {
      id: "current_ratio",
      value: null,
      excluded: true,
      exclusion: "Excluded: current liabilities are not greater than zero.",
      origin: "calculated",
    };
  }
  return { id: "current_ratio", value: assets / liabilities, excluded: false, exclusion: null, origin: "calculated" };
}

export function liabilitiesToAssetsValue(hospital: Hospital): MeasureValue {
  const assets = hospital.financials.totalAssets;
  const liabilities = hospital.financials.totalLiabilities;
  if (assets === null || liabilities === null) {
    return {
      id: "liabilities_to_assets",
      value: null,
      excluded: false,
      exclusion: "Missing in this report. Missing is not zero.",
      origin: "calculated",
    };
  }
  if (assets <= 0) {
    return {
      id: "liabilities_to_assets",
      value: null,
      excluded: true,
      exclusion: "Excluded: total assets are not greater than zero.",
      origin: "calculated",
    };
  }
  if (liabilities < 0) {
    return {
      id: "liabilities_to_assets",
      value: null,
      excluded: true,
      exclusion: "Excluded: published total liabilities are negative, so the ratio is not interpretable.",
      origin: "calculated",
    };
  }
  return {
    id: "liabilities_to_assets",
    value: liabilities / assets,
    excluded: false,
    exclusion: null,
    origin: "calculated",
  };
}

export function inpatientUtilizationValue(hospital: Hospital): MeasureValue {
  const days = hospital.financials.inpatientDays;
  const available = hospital.financials.bedDaysAvailable;
  if (days === null || available === null) {
    return {
      id: "inpatient_utilization",
      value: null,
      excluded: false,
      exclusion: "Missing in this report. Missing is not zero.",
      origin: "calculated",
    };
  }
  if (available <= 0) {
    return {
      id: "inpatient_utilization",
      value: null,
      excluded: true,
      exclusion: "Excluded: bed days available are not greater than zero.",
      origin: "calculated",
    };
  }
  return {
    id: "inpatient_utilization",
    value: days / available,
    excluded: false,
    exclusion: null,
    origin: "calculated",
  };
}

export function measureValue(view: HospitalView, id: MeasureId): MeasureValue {
  const hospital = view.hospital;
  const reported = (key: MeasureId, value: number | null): MeasureValue => ({
    id: key,
    value,
    excluded: false,
    exclusion: value === null ? "Missing in this report. Missing is not zero." : null,
    origin: "source_reported",
  });
  switch (id) {
    case "net_patient_revenue":
      return reported(id, hospital.financials.netPatientRevenue);
    case "patient_service_expenses":
      return reported(id, hospital.financials.operatingExpenses);
    case "published_patient_service_result":
      return reported(id, publishedPatientServiceResult(hospital).value);
    case "derived_patient_service_balance":
      return {
        id,
        value: derivedPatientServiceBalance(hospital),
        excluded: false,
        exclusion:
          derivedPatientServiceBalance(hospital) === null
            ? "Not calculated: Net Patient Revenue or Less Total Operating Expense is missing."
            : null,
        origin: "calculated",
      };
    case "patient_service_result_ratio":
      return patientServiceResultRatio(hospital);
    case "total_assets":
      return reported(id, hospital.financials.totalAssets);
    case "total_liabilities":
      return reported(id, hospital.financials.totalLiabilities);
    case "current_assets":
      return reported(id, hospital.financials.currentAssets);
    case "current_liabilities":
      return reported(id, hospital.financials.currentLiabilities);
    case "cash":
      return reported(id, hospital.financials.cash);
    case "current_ratio":
      return currentRatioValue(hospital);
    case "liabilities_to_assets":
      return liabilitiesToAssetsValue(hospital);
    case "inpatient_days":
      return reported(id, hospital.financials.inpatientDays);
    case "bed_days_available":
      return reported(id, hospital.financials.bedDaysAvailable);
    case "inpatient_utilization":
      return inpatientUtilizationValue(hospital);
    default: {
      const _never: never = id;
      return _never;
    }
  }
}

export function patientServiceReconcile(hospital: Hospital): {
  published: number | null;
  derived: number | null;
  reconciled: boolean;
  note: string;
} {
  const published = publishedPatientServiceResult(hospital).value;
  const derived = derivedPatientServiceBalance(hospital);
  if (published === null || derived === null) {
    return {
      published,
      derived,
      reconciled: published === null || derived === null,
      note:
        published === null && derived === null
          ? "Neither the published result nor a derived balance is available."
          : "One of the published result or the derived subtraction is missing. PulseLine does not overwrite one with the other.",
    };
  }
  const reconciled = Math.abs(published - derived) <= 1;
  return {
    published,
    derived,
    reconciled,
    note: reconciled
      ? "The published patient-service result matches the derived subtraction within $1."
      : "The published Net Income from Service to Patients differs from Net Patient Revenue minus Less Total Operating Expense. Both figures are shown. PulseLine does not overwrite one with the other.",
  };
}

export function dashboardCardIds(view: HospitalView): MeasureId[] {
  const cards: MeasureId[] = [
    "net_patient_revenue",
    "patient_service_expenses",
    "published_patient_service_result",
    "cash",
  ];
  const current = currentRatioValue(view.hospital);
  if (current.value !== null || current.excluded || current.exclusion) cards.push("current_ratio");
  const leverage = liabilitiesToAssetsValue(view.hospital);
  if (leverage.value !== null || leverage.excluded || leverage.exclusion) cards.push("liabilities_to_assets");
  return cards;
}
