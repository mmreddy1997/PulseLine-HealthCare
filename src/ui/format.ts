import type { FinancialStatus } from "../types.ts";

export function money(value: number | null): string {
  if (value === null || value === undefined) return "Not available in current dataset";
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 25_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`;
  return `${sign}$${Math.round(abs).toLocaleString("en-US")}`;
}

export function percent(value: number | null): string {
  if (value === null || value === undefined) return "Not available in current dataset";
  return `${(value * 100).toFixed(1)}%`;
}

export function ratio(value: number | null): string {
  if (value === null || value === undefined) return "Not available in current dataset";
  const two = value.toFixed(2);
  if ((two === "0.00" || two === "-0.00") && value !== 0) {
    return value.toFixed(4);
  }
  return two;
}

export function evidenceDate(value: string | null, precision?: string | null): string {
  if (!value) return "Unknown";
  if (precision === "month") return `${value} (month precision)`;
  if (precision === "year") return `${value} (year precision)`;
  if (precision === "day") return value;
  return value;
}

export function fiscalLabel(start: string | null, end: string): string {
  if (start) return `${start} to ${end}`;
  return `Ending ${end}`;
}

export function statusClass(status: FinancialStatus): string {
  if (status === "High Concern") return "status-high";
  if (status === "Watch") return "status-watch";
  if (status === "Insufficient data") return "status-insufficient";
  return "status-stable";
}
