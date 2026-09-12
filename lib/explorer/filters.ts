import type { ExplorerFilters, ExplorerHospital, ExplorerResult, ExplorerSort, FilterChip } from "./types.ts";
import {
  EVENT_FILTERS,
  PENDING_FILTER,
  UNKNOWN_FILTER,
  defaultExplorerFilters,
  eventFilterLabel,
  type EventFilter,
} from "./types.ts";
import { zipMatches } from "./locations.ts";

const CONCERN_RANK: Record<ExplorerHospital["financialStatus"], number> = {
  "High Concern": 0,
  Watch: 1,
  Stable: 2,
  "Insufficient data": 3,
  pending: 4,
};

const COVERAGE_RANK: Record<ExplorerHospital["dataCoverage"], number> = {
  High: 0,
  Moderate: 1,
  Low: 2,
  None: 3,
  pending: 4,
};

function normalizeQuery(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function hospitalMatchesQuery(hospital: ExplorerHospital, rawQuery: string): boolean {
  const query = normalizeQuery(rawQuery);
  if (!query) return true;
  const zipQuery = query.replace(/\s+/g, "");
  if (/^\d{3,5}$/.test(zipQuery) && zipMatches(hospital.zip, zipQuery)) return true;
  const hay = [hospital.name, hospital.city, hospital.county, hospital.zip]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return query.split(" ").every((token) => hay.includes(token));
}

function ruralKey(hospital: ExplorerHospital): string {
  return hospital.ruralClassification ? "cah" : UNKNOWN_FILTER;
}

function ownershipKey(hospital: ExplorerHospital): string {
  return hospital.ownershipCategory ?? UNKNOWN_FILTER;
}

function eventMatches(hospital: ExplorerHospital, filters: EventFilter[]): boolean {
  if (filters.length === 0) return true;
  return filters.some((value) => {
    if (value === "none_in_ledger") return hospital.eventTypes.length === 0;
    return hospital.eventTypes.includes(value);
  });
}

export function activeFilterChips(
  filters: ExplorerFilters,
  hospitals: ExplorerHospital[],
  countyNames: Record<string, string> = {},
): FilterChip[] {
  const chips: FilterChip[] = [];
  if (filters.query.trim()) {
    chips.push({ id: "query", key: "query", value: filters.query, label: `Search: ${filters.query.trim()}` });
  }
  for (const fips of filters.countyFips) {
    const name = hospitals.find((item) => item.countyFips === fips)?.county ?? countyNames[fips] ?? fips;
    chips.push({ id: `county:${fips}`, key: "countyFips", value: fips, label: `County: ${name}` });
  }
  for (const zip of filters.zips) {
    chips.push({ id: `zip:${zip}`, key: "zips", value: zip, label: `ZIP: ${zip}` });
  }
  for (const concern of filters.concerns) {
    chips.push({
      id: `concern:${concern}`,
      key: "concerns",
      value: concern,
      label: concern === "pending" ? "Concern: financial data pending" : `Concern: ${concern}`,
    });
  }
  for (const coverage of filters.coverages) {
    chips.push({
      id: `coverage:${coverage}`,
      key: "coverages",
      value: coverage,
      label: coverage === "pending" ? "Coverage: pending" : `Coverage: ${coverage}`,
    });
  }
  for (const period of filters.fiscalPeriods) {
    chips.push({
      id: `fiscal:${period}`,
      key: "fiscalPeriods",
      value: period,
      label: period === PENDING_FILTER ? "Fiscal period: pending" : `Latest fiscal end: ${period}`,
    });
  }
  for (const eventType of filters.eventTypes) {
    chips.push({
      id: `event:${eventType}`,
      key: "eventTypes",
      value: eventType,
      label: `Event: ${eventFilterLabel(eventType)}`,
    });
  }
  for (const ownership of filters.ownerships) {
    chips.push({
      id: `ownership:${ownership}`,
      key: "ownerships",
      value: ownership,
      label: ownership === UNKNOWN_FILTER ? "Ownership: unknown" : `Ownership: ${ownership}`,
    });
  }
  for (const rural of filters.ruralStatuses) {
    chips.push({
      id: `rural:${rural}`,
      key: "ruralStatuses",
      value: rural,
      label: rural === "cah" ? "Rural/CAH: sourced CAH" : "Rural/CAH: unknown",
    });
  }
  return chips;
}

function compareHospitals(left: ExplorerHospital, right: ExplorerHospital, sort: ExplorerSort): number {
  if (sort === "name") return left.name.localeCompare(right.name);
  if (sort === "county") {
    const county = (left.county ?? "zzz").localeCompare(right.county ?? "zzz");
    return county !== 0 ? county : left.name.localeCompare(right.name);
  }
  if (sort === "coverage") {
    const coverage = COVERAGE_RANK[left.dataCoverage] - COVERAGE_RANK[right.dataCoverage];
    return coverage !== 0 ? coverage : left.name.localeCompare(right.name);
  }
  if (sort === "score") {
    if (left.score === null && right.score === null) return left.name.localeCompare(right.name);
    if (left.score === null) return 1;
    if (right.score === null) return -1;
    if (right.score !== left.score) return right.score - left.score;
    return left.name.localeCompare(right.name);
  }
  const concern = CONCERN_RANK[left.financialStatus] - CONCERN_RANK[right.financialStatus];
  if (concern !== 0) return concern;
  if (left.score !== null && right.score !== null && left.score !== right.score) return right.score - left.score;
  return left.name.localeCompare(right.name);
}

export function filterExplorerHospitals(
  hospitals: ExplorerHospital[],
  filters: ExplorerFilters = defaultExplorerFilters(),
  countyNames: Record<string, string> = {},
): ExplorerResult {
  const matched = hospitals.filter((hospital) => {
    if (!hospitalMatchesQuery(hospital, filters.query)) return false;
    if (filters.countyFips.length > 0 && (!hospital.countyFips || !filters.countyFips.includes(hospital.countyFips))) {
      return false;
    }
    if (filters.zips.length > 0 && !filters.zips.some((zip) => zipMatches(hospital.zip, zip))) {
      return false;
    }
    if (filters.concerns.length > 0 && !filters.concerns.includes(hospital.financialStatus)) {
      return false;
    }
    if (filters.coverages.length > 0 && !filters.coverages.includes(hospital.dataCoverage)) {
      return false;
    }
    if (filters.fiscalPeriods.length > 0 && !filters.fiscalPeriods.includes(hospital.latestFiscalKey)) {
      return false;
    }
    if (!eventMatches(hospital, filters.eventTypes)) return false;
    if (filters.ownerships.length > 0 && !filters.ownerships.includes(ownershipKey(hospital))) {
      return false;
    }
    if (filters.ruralStatuses.length > 0 && !filters.ruralStatuses.includes(ruralKey(hospital))) {
      return false;
    }
    return true;
  });
  const items = [...matched].sort((left, right) => compareHospitals(left, right, filters.sort));
  const chips = activeFilterChips(filters, hospitals, countyNames);
  const empty = items.length === 0;
  return {
    items,
    totalInDataset: hospitals.length,
    matchCount: items.length,
    emptyReason: empty ? "no_matches" : "none",
    emptyMessage: empty ? "No matching hospitals in PulseLine." : null,
    chips,
    datasetLabel: `Showing ${hospitals.length} ${pluralHospitals(hospitals.length)} in the current dataset.`,
  };
}

export function pluralHospitals(count: number): string {
  return count === 1 ? "hospital" : "hospitals";
}

export function visibleSelectedHospitalId(
  items: Array<{ hospitalId: string }>,
  selectedId: string | null,
): string | null {
  if (selectedId && items.some((item) => item.hospitalId === selectedId)) {
    return selectedId;
  }
  if (items.length === 1) {
    return items[0]?.hospitalId ?? null;
  }
  return null;
}

export function removeFilterChip(filters: ExplorerFilters, chip: FilterChip): ExplorerFilters {
  if (chip.key === "query") return { ...filters, query: "" };
  if (chip.key === "countyFips") return { ...filters, countyFips: filters.countyFips.filter((item) => item !== chip.value) };
  if (chip.key === "zips") return { ...filters, zips: filters.zips.filter((item) => item !== chip.value) };
  if (chip.key === "concerns") {
    return { ...filters, concerns: filters.concerns.filter((item) => item !== chip.value) };
  }
  if (chip.key === "coverages") {
    return { ...filters, coverages: filters.coverages.filter((item) => item !== chip.value) };
  }
  if (chip.key === "fiscalPeriods") {
    return { ...filters, fiscalPeriods: filters.fiscalPeriods.filter((item) => item !== chip.value) };
  }
  if (chip.key === "eventTypes") {
    return { ...filters, eventTypes: filters.eventTypes.filter((item) => item !== chip.value) };
  }
  if (chip.key === "ownerships") {
    return { ...filters, ownerships: filters.ownerships.filter((item) => item !== chip.value) };
  }
  return { ...filters, ruralStatuses: filters.ruralStatuses.filter((item) => item !== chip.value) };
}

export function uniqueCounties(hospitals: ExplorerHospital[]): { fips: string; name: string }[] {
  const seen = new Map<string, string>();
  for (const hospital of hospitals) {
    if (hospital.countyFips && hospital.county) seen.set(hospital.countyFips, hospital.county);
  }
  return [...seen.entries()]
    .map(([fips, name]) => ({ fips, name }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function uniqueZips(hospitals: ExplorerHospital[]): string[] {
  return [...new Set(hospitals.map((hospital) => hospital.zip).filter((zip): zip is string => Boolean(zip)))].sort();
}

export function uniqueFiscalKeys(hospitals: ExplorerHospital[]): string[] {
  return [...new Set(hospitals.map((hospital) => hospital.latestFiscalKey))].sort((left, right) => {
    if (left === PENDING_FILTER) return 1;
    if (right === PENDING_FILTER) return -1;
    return right.localeCompare(left);
  });
}

export function uniqueOwnerships(hospitals: ExplorerHospital[]): string[] {
  const values = new Set(hospitals.map(ownershipKey));
  return [...values].sort((left, right) => {
    if (left === UNKNOWN_FILTER) return 1;
    if (right === UNKNOWN_FILTER) return -1;
    return left.localeCompare(right);
  });
}

export function uniqueRuralStatuses(hospitals: ExplorerHospital[]): string[] {
  return [...new Set(hospitals.map(ruralKey))].sort((left, right) => {
    if (left === UNKNOWN_FILTER) return 1;
    if (right === UNKNOWN_FILTER) return -1;
    return left.localeCompare(right);
  });
}

export function availableEventFilters(hospitals: ExplorerHospital[]): EventFilter[] {
  const present = new Set<EventFilter>();
  for (const hospital of hospitals) {
    if (hospital.eventTypes.length === 0) present.add("none_in_ledger");
    for (const eventType of hospital.eventTypes) {
      if ((EVENT_FILTERS as readonly string[]).includes(eventType)) {
        present.add(eventType as EventFilter);
      }
    }
  }
  return EVENT_FILTERS.filter((item) => present.has(item));
}

export function countyHospitalCounts(hospitals: ExplorerHospital[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const hospital of hospitals) {
    if (!hospital.countyFips) continue;
    counts.set(hospital.countyFips, (counts.get(hospital.countyFips) ?? 0) + 1);
  }
  return counts;
}
