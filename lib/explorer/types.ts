import type { DataCoverage, EventCategory, FinancialStatus } from "../../src/types.ts";

export const RECORD_KINDS = ["scored", "research"] as const;
export type RecordKind = (typeof RECORD_KINDS)[number];

export const LOCATION_STATUSES = ["facility_county", "city_county", "pending"] as const;
export type LocationStatus = (typeof LOCATION_STATUSES)[number];

export const CONCERN_FILTERS = ["High Concern", "Watch", "Stable", "Insufficient data", "pending"] as const;
export type ConcernFilter = (typeof CONCERN_FILTERS)[number];

export const COVERAGE_FILTERS = ["High", "Moderate", "Low", "None", "pending"] as const;
export type CoverageFilter = (typeof COVERAGE_FILTERS)[number];

export const EVENT_FILTERS = [
  "acquisition",
  "property_transaction",
  "parent_bankruptcy",
  "parent_restructuring",
  "none_in_ledger",
] as const;
export type EventFilter = (typeof EVENT_FILTERS)[number];

export const UNKNOWN_FILTER = "unknown";
export const PENDING_FILTER = "pending";

export const EXPLORER_SORTS = ["concern", "name", "county", "coverage", "score"] as const;
export type ExplorerSort = (typeof EXPLORER_SORTS)[number];

export const EXPLORER_SORT_HELP: Record<ExplorerSort, string> = {
  concern:
    "High Concern, then Watch, Stable, insufficient or pending. Name breaks ties. This is experimental financial concern, not an acquisition ranking.",
  name: "Hospital name, A to Z.",
  county: "County name, A to Z. Hospitals without a county sort last.",
  coverage: "High, Moderate, Low, None, then pending. Name breaks ties.",
  score: "Highest experimental financial concern score first. Hospitals without a score sort last. This is not acquisition attractiveness.",
};

export const FILTER_LOCATION_HELP =
  "County and ZIP filters use the facility location recorded in PulseLine, not the patient service area. ZIP codes are postal strings, not Census ZCTA polygons.";

export const DATASET_SCOPE_NOTE = "PulseLine does not include every Kentucky hospital.";

export const SCREENING_SORT_LIMIT =
  "The experimental score screens historical financial concern. It is not acquisition attractiveness, seller willingness, or likelihood of a transaction.";

export interface ExplorerHospital {
  hospitalId: string;
  name: string;
  city: string | null;
  county: string | null;
  countyFips: string | null;
  zip: string | null;
  kind: RecordKind;
  financialStatus: FinancialStatus | "pending";
  score: number | null;
  dataCoverage: DataCoverage | "pending";
  latestFiscalPeriod: string | null;
  latestFiscalKey: string;
  eventTypes: EventCategory[];
  ownershipCategory: string | null;
  ruralClassification: string | null;
  evidenceGap: string;
  locationStatus: LocationStatus;
  locationNote: string;
  latitude: number | null;
  longitude: number | null;
}

export interface ExplorerFilters {
  query: string;
  countyFips: string[];
  zips: string[];
  concerns: ConcernFilter[];
  coverages: CoverageFilter[];
  fiscalPeriods: string[];
  eventTypes: EventFilter[];
  ownerships: string[];
  ruralStatuses: string[];
  sort: ExplorerSort;
}

export type FilterChipKey = keyof Omit<ExplorerFilters, "sort">;

export interface FilterChip {
  id: string;
  key: FilterChipKey;
  value: string;
  label: string;
}

export interface ExplorerResult {
  items: ExplorerHospital[];
  totalInDataset: number;
  matchCount: number;
  emptyReason: "none" | "no_matches";
  emptyMessage: string | null;
  chips: FilterChip[];
  datasetLabel: string;
}

export const defaultExplorerFilters = (): ExplorerFilters => ({
  query: "",
  countyFips: [],
  zips: [],
  concerns: [],
  coverages: [],
  fiscalPeriods: [],
  eventTypes: [],
  ownerships: [],
  ruralStatuses: [],
  sort: "concern",
});

export function eventFilterLabel(value: EventFilter): string {
  if (value === "none_in_ledger") return "None attached in PulseLine";
  if (value === "property_transaction") return "Property transaction";
  if (value === "parent_bankruptcy") return "Parent bankruptcy";
  if (value === "parent_restructuring") return "Parent restructuring";
  return "Acquisition / rename";
}
