import { screeningEvidenceGap } from "../diligence/gaps.ts";
import type { EvidenceHospital, EventCategory, FacilityRadarView, StructuralEvent } from "../../src/types.ts";
import { COORDINATE_PENDING_NOTE, locateFromCity, normalizeZip } from "./locations.ts";
import { PENDING_FILTER, type ExplorerHospital } from "./types.ts";

function fiscalKey(end: string | null | undefined): string {
  if (!end) return PENDING_FILTER;
  const year = end.slice(0, 4);
  return /^\d{4}$/.test(year) ? year : PENDING_FILTER;
}

function eventTypesFor(hospitalId: string, events: StructuralEvent[]): EventCategory[] {
  return [...new Set(events.filter((event) => event.hospitalId === hospitalId).map((event) => event.eventCategory))];
}

export function catalogFromScored(facility: FacilityRadarView, events: StructuralEvent[] = []): ExplorerHospital {
  const hospital = facility.latest.hospital;
  const ccnMismatch = Boolean(
    hospital.historicalCcn && hospital.currentCcn && hospital.historicalCcn !== hospital.currentCcn,
  );
  return {
    hospitalId: facility.hospitalId,
    name: facility.name,
    city: hospital.city || null,
    county: hospital.county,
    countyFips: hospital.countyFips,
    zip: normalizeZip(hospital.zip),
    kind: "scored",
    financialStatus: facility.latest.financial.status,
    score: facility.latest.financial.score,
    dataCoverage: facility.latest.financial.dataCoverage,
    latestFiscalPeriod: `${hospital.fiscalYearStart ?? "Unknown"} to ${hospital.fiscalYearEnd}`,
    latestFiscalKey: fiscalKey(hospital.fiscalYearEnd),
    eventTypes: eventTypesFor(facility.hospitalId, events),
    ownershipCategory: hospital.ownershipCategory,
    ruralClassification: hospital.ruralClassification,
    evidenceGap: screeningEvidenceGap({
      pending: false,
      addressMismatch: hospital.dataQuality.addressMismatch,
      identityUnresolved: hospital.dataQuality.identityStatus === "unresolved",
      locationPending: !hospital.countyFips && !hospital.county,
      ccnMismatch,
    }),
    locationStatus: hospital.countyFips || hospital.county ? "facility_county" : "pending",
    locationNote: hospital.county
      ? `Facility county from the research pack. ${COORDINATE_PENDING_NOTE}`
      : COORDINATE_PENDING_NOTE,
    latitude: null,
    longitude: null,
  };
}

export function catalogFromResearch(hospital: EvidenceHospital, events: StructuralEvent[] = []): ExplorerHospital {
  const located = locateFromCity(hospital.city);
  return {
    hospitalId: hospital.hospitalId,
    name: hospital.name,
    city: hospital.city || null,
    county: located.county,
    countyFips: located.countyFips,
    zip: null,
    kind: "research",
    financialStatus: "pending",
    score: null,
    dataCoverage: "pending",
    latestFiscalPeriod: null,
    latestFiscalKey: PENDING_FILTER,
    eventTypes: eventTypesFor(hospital.hospitalId, events),
    ownershipCategory: null,
    ruralClassification: null,
    evidenceGap: screeningEvidenceGap({
      pending: true,
      addressMismatch: false,
      identityUnresolved: true,
      locationPending: located.locationStatus === "pending",
      ccnMismatch: false,
    }),
    locationStatus: located.locationStatus,
    locationNote: located.locationNote,
    latitude: null,
    longitude: null,
  };
}

export function buildExplorerCatalog(
  facilities: FacilityRadarView[],
  researchCases: EvidenceHospital[],
  events: StructuralEvent[] = [],
): ExplorerHospital[] {
  const scored = facilities.map((facility) => catalogFromScored(facility, events));
  const pending = researchCases
    .filter((hospital) => !scored.some((item) => item.hospitalId === hospital.hospitalId))
    .map((hospital) => catalogFromResearch(hospital, events));
  return [...scored, ...pending];
}
