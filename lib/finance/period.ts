import type { Hospital, HospitalView } from "../../src/types.ts";

const MS_PER_DAY = 86_400_000;

export interface PeriodMeta {
  start: string | null;
  end: string;
  periodDays: number | null;
  fileCohort: number | null;
  ageDays: number | null;
  ageLabel: string;
  publicationDate: string | null;
  publicationStatus: "verified_date" | "unverified";
  publicationLabel: string;
  historicalNote: string;
}

function utcDay(iso: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const time = Date.parse(`${iso}T00:00:00Z`);
  return Number.isFinite(time) ? time : null;
}

export function periodAgeDays(fiscalEnd: string, asOf = new Date()): number | null {
  const end = utcDay(fiscalEnd);
  if (end === null) return null;
  const today = Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth(), asOf.getUTCDate());
  return Math.floor((today - end) / MS_PER_DAY);
}

export function periodAgeLabel(ageDays: number | null): string {
  if (ageDays === null) return "Age of this fiscal period is unknown.";
  if (ageDays < 0) return "Fiscal end is after the review date used in PulseLine.";
  const years = Math.floor(ageDays / 365);
  const months = Math.floor((ageDays % 365) / 30);
  if (years >= 2) return `This fiscal period ended about ${years} years before the review date.`;
  if (years === 1) return months > 0 ? `This fiscal period ended about 1 year and ${months} months before the review date.` : "This fiscal period ended about 1 year before the review date.";
  if (months >= 1) return `This fiscal period ended about ${months} month${months === 1 ? "" : "s"} before the review date.`;
  return `This fiscal period ended ${ageDays} day${ageDays === 1 ? "" : "s"} before the review date.`;
}

export function publicationStatus(hospital: Hospital): Pick<PeriodMeta, "publicationDate" | "publicationStatus" | "publicationLabel"> {
  const publicationDate = hospital.publicationDate ?? null;
  if (publicationDate) {
    return {
      publicationDate,
      publicationStatus: "verified_date",
      publicationLabel: `Source publication date ${publicationDate}. That date is not the fiscal period.`,
    };
  }
  return {
    publicationDate: null,
    publicationStatus: "unverified",
    publicationLabel: "Source publication date is unverified. A fiscal period is not a publication date.",
  };
}

export function periodMeta(view: HospitalView, asOf = new Date()): PeriodMeta {
  const hospital = view.hospital;
  const ageDays = periodAgeDays(hospital.fiscalYearEnd, asOf);
  const publication = publicationStatus(hospital);
  return {
    start: hospital.fiscalYearStart,
    end: hospital.fiscalYearEnd,
    periodDays: hospital.periodDays,
    fileCohort: hospital.fileCohort,
    ageDays,
    ageLabel: periodAgeLabel(ageDays),
    ...publication,
    historicalNote: "Historical CMS figures describe the selected fiscal report. They are not current operating conditions.",
  };
}
