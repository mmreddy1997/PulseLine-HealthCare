import type { FinancialStatus } from "../types.ts";

export function money(value: number | null): string {
  if (value === null || value === undefined) return "Not available in current dataset";
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 25_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`;
  return `${sign}$${Math.round(abs).toLocaleString("en-US")}`;
}

/** Exact USD for Ask answers so a model cannot silently change units or rounding. */
export function moneyExact(value: number | null): string {
  if (value === null || value === undefined) return "Not available in the current PulseLine data.";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
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

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const LONG_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function monthYear(iso: string, months: string[]): string | null {
  const match = /^(\d{4})-(\d{2})/.exec(iso);
  if (!match) return null;
  const month = months[Number(match[2]) - 1];
  if (!month) return null;
  return `${month} ${match[1]}`;
}

export function shortFiscalRange(start: string | null, end: string): string {
  const startLabel = start ? monthYear(start, SHORT_MONTHS) : null;
  const endLabel = monthYear(end, SHORT_MONTHS);
  if (startLabel && endLabel) return `${startLabel} – ${endLabel}`;
  return fiscalLabel(start, end);
}

export function longFiscalRange(start: string | null, end: string): string {
  const startLabel = start ? monthYear(start, LONG_MONTHS) : null;
  const endLabel = monthYear(end, LONG_MONTHS);
  if (startLabel && endLabel) return `${startLabel} – ${endLabel}`;
  return fiscalLabel(start, end);
}

/** Rounded display figure for Ask cards. Exact USD stays in the statement. */
export function moneyHeadline(value: number | null): string | null {
  if (value === null || value === undefined) return null;
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)} million`;
  return moneyExact(value);
}

export function statusClass(status: FinancialStatus): string {
  if (status === "High Concern") return "status-high";
  if (status === "Watch") return "status-watch";
  if (status === "Insufficient data") return "status-insufficient";
  return "status-stable";
}

function channel(value: number): number {
  const scaled = value / 255;
  return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const value = hex.replace("#", "");
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue);
}

/** WCAG contrast ratio for two #RRGGBB colors. */
export function contrastRatio(foreground: string, background: string): number {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
}
