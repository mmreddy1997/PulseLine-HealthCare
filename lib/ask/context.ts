import type { EvidenceHospital, EvidenceLedger, FacilityRadarView } from "../../src/types.ts";
import { eventsForHospital, observationsForHospital } from "../adapt-evidence.ts";
import type { ScenarioResult } from "../scenario/whatif.ts";
import type { AskContext } from "./types.ts";

export function scoredAskContext(
  facility: FacilityRadarView,
  selectedReportId: string | null,
  ledger: EvidenceLedger | undefined,
  otherNames: string[],
  scenario: ScenarioResult | null = null,
): AskContext {
  const selected =
    facility.reports.find((report) => report.hospital.id === selectedReportId) ?? facility.latest;
  return {
    kind: "scored",
    hospitalId: facility.hospitalId,
    hospitalName: facility.name,
    selectedReport: selected,
    reports: facility.reports,
    events: eventsForHospital(ledger, facility.hospitalId),
    observations: observationsForHospital(ledger, facility.hospitalId),
    research: null,
    otherHospitalNames: otherNames.filter((name) => name !== facility.name),
    scenario,
  };
}

export function researchAskContext(
  hospital: EvidenceHospital,
  ledger: EvidenceLedger | undefined,
  otherNames: string[],
  scenario: ScenarioResult | null = null,
): AskContext {
  return {
    kind: "research",
    hospitalId: hospital.hospitalId,
    hospitalName: hospital.name,
    selectedReport: null,
    reports: [],
    events: eventsForHospital(ledger, hospital.hospitalId),
    observations: observationsForHospital(ledger, hospital.hospitalId),
    research: hospital,
    otherHospitalNames: otherNames.filter((name) => name !== hospital.name),
    scenario,
  };
}
