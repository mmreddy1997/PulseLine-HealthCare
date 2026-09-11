import { normalizeHospital, type HospitalExtractRecord } from "./normalize-hospital.ts";
import { buildPulseLineSignal } from "./pulse-signal.ts";
import { scoreFinancialDistress } from "./score-financial.ts";
import { buildWorkforceSignal } from "./workforce.ts";
import type { HospitalView } from "../src/types.ts";

export interface HospitalExtractFile {
  disclaimer: string;
  source: string;
  retrievedAt: string;
  observations: HospitalExtractRecord[];
}

export function buildHospitalViews(extract: HospitalExtractFile): HospitalView[] {
  const workforce = buildWorkforceSignal();
  return extract.observations.map((record) => {
    const hospital = normalizeHospital(record);
    const financial = scoreFinancialDistress(hospital);
    return {
      hospital,
      financial,
      workforce,
      pulse: buildPulseLineSignal(financial, workforce),
    };
  });
}
