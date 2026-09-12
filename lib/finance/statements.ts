import type { HospitalView } from "../../src/types.ts";
import { orderedReports } from "./comparability.ts";
import {
  MEASURES,
  measureValue,
  patientServiceReconcile,
  type MeasureGroup,
  type MeasureId,
} from "./measures.ts";

export const STATEMENT_GROUPS: { id: MeasureGroup; label: string }[] = [
  { id: "patient_service", label: "Patient-service activity" },
  { id: "balance_sheet", label: "Balance-sheet measures" },
  { id: "liquidity", label: "Liquidity measures" },
  { id: "operational", label: "Operational measures" },
];

const STATEMENT_ROWS: MeasureId[] = [
  "net_patient_revenue",
  "patient_service_expenses",
  "published_patient_service_result",
  "derived_patient_service_balance",
  "patient_service_result_ratio",
  "total_assets",
  "total_liabilities",
  "current_assets",
  "current_liabilities",
  "cash",
  "current_ratio",
  "liabilities_to_assets",
  "inpatient_days",
  "bed_days_available",
  "inpatient_utilization",
];

export interface StatementCell {
  reportId: string;
  value: number | null;
  excluded: boolean;
  exclusion: string | null;
  origin: "source_reported" | "calculated";
}

export interface StatementRow {
  id: MeasureId;
  label: string;
  group: MeasureGroup;
  unit: (typeof MEASURES)[MeasureId]["unit"];
  origin: "source_reported" | "calculated";
  cmsField: string | null;
  definition: string;
  not: string;
  cells: StatementCell[];
}

export interface FinancialStatement {
  columns: { reportId: string; start: string | null; end: string; fileCohort: number | null }[];
  rows: StatementRow[];
  reconcileNotes: { reportId: string; note: string; reconciled: boolean }[];
}

export function financialStatement(reports: HospitalView[]): FinancialStatement {
  const columns = orderedReports(reports);
  return {
    columns: columns.map((report) => ({
      reportId: report.hospital.id,
      start: report.hospital.fiscalYearStart,
      end: report.hospital.fiscalYearEnd,
      fileCohort: report.hospital.fileCohort,
    })),
    rows: STATEMENT_ROWS.map((id) => {
      const definition = MEASURES[id];
      return {
        id,
        label: definition.label,
        group: definition.group,
        unit: definition.unit,
        origin: definition.origin,
        cmsField: definition.cmsField,
        definition: definition.definition,
        not: definition.not,
        cells: columns.map((report) => {
          const cell = measureValue(report, id);
          return {
            reportId: report.hospital.id,
            value: cell.value,
            excluded: cell.excluded,
            exclusion: cell.exclusion,
            origin: cell.origin,
          };
        }),
      };
    }),
    reconcileNotes: columns.map((report) => {
      const reconcile = patientServiceReconcile(report.hospital);
      return { reportId: report.hospital.id, note: reconcile.note, reconciled: reconcile.reconciled };
    }),
  };
}
