import type { ExplorerHospital } from "../../lib/explorer/types.ts";

/** Isolated development fixture. Never imported by the production UI. */
export const SCALE_FIXTURE_SIZE = 120;

export function scaleExplorerFixture(size = SCALE_FIXTURE_SIZE): ExplorerHospital[] {
  return Array.from({ length: size }, (_, index) => {
    const fips = String(21001 + (index % 120)).padStart(5, "0");
    return {
      hospitalId: `dev_scale_${String(index + 1).padStart(3, "0")}`,
      name: `Scale Fixture Hospital ${index + 1}`,
      city: `City ${index + 1}`,
      county: `County ${index + 1}`,
      countyFips: fips,
      zip: String(40000 + index),
      kind: index % 7 === 0 ? "research" : "scored",
      financialStatus: index % 7 === 0 ? "pending" : index % 5 === 0 ? "High Concern" : index % 3 === 0 ? "Watch" : "Stable",
      score: index % 7 === 0 ? null : 20 + (index % 70),
      dataCoverage: index % 7 === 0 ? "pending" : index % 4 === 0 ? "High" : "Moderate",
      latestFiscalPeriod: index % 7 === 0 ? null : "2023-07-01 to 2024-06-30",
      latestFiscalKey: index % 7 === 0 ? "pending" : "2024",
      eventTypes: index % 9 === 0 ? [] : ["acquisition"],
      ownershipCategory: index % 7 === 0 ? null : "Proprietary",
      ruralClassification: index % 7 === 0 ? null : "CAH: rural or treated as rural under CMS criteria",
      evidenceGap: index % 7 === 0 ? "Financial data pending" : "No identity gap flagged in PulseLine",
      locationStatus: "facility_county",
      locationNote: "Development fixture only. Not a PulseLine hospital.",
      latitude: index % 11 === 0 ? null : 37.5 + (index % 10) * 0.05,
      longitude: index % 11 === 0 ? null : -85.5 - (index % 8) * 0.05,
    };
  });
}
