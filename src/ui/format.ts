import type { FinancialStatus } from "../types.ts";

export function money(value: number | null): string {
  if (value === null || value === undefined) return "Not available in current dataset";
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`;
  return `${sign}$${abs.toLocaleString("en-US")}`;
}

export function percent(value: number | null): string {
  if (value === null || value === undefined) return "Not available in current dataset";
  return `${(value * 100).toFixed(1)}%`;
}

export function ratio(value: number | null): string {
  if (value === null || value === undefined) return "Not available in current dataset";
  return value.toFixed(2);
}

export function fiscalLabel(start: string | null, end: string): string {
  if (start) return `${start} to ${end}`;
  return `Ending ${end}`;
}

export function statusClass(status: FinancialStatus): string {
  if (status === "High Concern") return "status-high";
  if (status === "Watch") return "status-watch";
  return "status-stable";
}
