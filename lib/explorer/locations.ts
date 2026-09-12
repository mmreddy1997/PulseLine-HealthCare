import type { LocationStatus } from "./types.ts";

/**
 * City → county is used only when the evidence ledger records a city
 * and the research pack has no county. This is not a street coordinate.
 */
export const CITY_COUNTY: Record<
  string,
  { county: string; countyFips: string; source: string }
> = {
  Paintsville: {
    county: "Johnson",
    countyFips: "21115",
    source: "U.S. Census Bureau county FIPS for the documented city of Paintsville. Hospital street location is pending.",
  },
  Prestonsburg: {
    county: "Floyd",
    countyFips: "21071",
    source: "U.S. Census Bureau county FIPS for the documented city of Prestonsburg. Hospital street location is pending.",
  },
};

export const COORDINATE_PENDING_NOTE =
  "Coordinates are not verified in the research pack (latitude and longitude are null). PulseLine does not place a fabricated marker.";

export function normalizeZip(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim().replace(/-$/, "");
  if (trimmed === "") return null;
  return trimmed;
}

export function zipMatches(haystack: string | null, needle: string): boolean {
  const zip = normalizeZip(haystack);
  const query = normalizeZip(needle);
  if (!zip || !query) return false;
  return zip === query || zip.startsWith(query) || query.startsWith(zip);
}

export function locateFromCity(city: string | null | undefined): {
  county: string | null;
  countyFips: string | null;
  locationStatus: LocationStatus;
  locationNote: string;
} {
  if (!city) {
    return {
      county: null,
      countyFips: null,
      locationStatus: "pending",
      locationNote: `County pending. ${COORDINATE_PENDING_NOTE}`,
    };
  }
  const mapped = CITY_COUNTY[city];
  if (!mapped) {
    return {
      county: null,
      countyFips: null,
      locationStatus: "pending",
      locationNote: `County pending for ${city}. ${COORDINATE_PENDING_NOTE}`,
    };
  }
  return {
    county: mapped.county,
    countyFips: mapped.countyFips,
    locationStatus: "city_county",
    locationNote: `${mapped.source} ${COORDINATE_PENDING_NOTE}`,
  };
}
