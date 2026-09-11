import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { adaptEvidencePack } from "../lib/adapt-evidence.ts";

const evidencePath = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "research",
  "PulseLine_expanded_evidence_v1.json",
);

function validPack(): Record<string, unknown> {
  return JSON.parse(readFileSync(evidencePath, "utf8")) as Record<string, unknown>;
}

describe("evidence adapter", () => {
  it("adapts the sourced ledger and preserves month precision and scopes", () => {
    const result = adaptEvidencePack(validPack());
    assert.equal(result.ok, true);
    assert.equal(result.ledger?.hospitals.length, 3);
    assert.equal(result.ledger?.events.length, 5);
    const sale = result.ledger?.events.find((event) => event.eventId === "kr_property_sale_2021");
    assert.equal(sale?.effectiveDate, "2021-09");
    assert.equal(sale?.effectiveDatePrecision, "month");
    assert.equal(sale?.scope, "property");
    assert.equal(sale?.eventCategory, "property_transaction");
    const bankruptcy = result.ledger?.events.find((event) => event.eventId === "quorum_bankruptcy_2020");
    assert.equal(bankruptcy?.eventStatus, "verified_parent_event");
    assert.equal(bankruptcy?.verifiedOutcome, false);
    assert.equal(bankruptcy?.scope, "parent_and_named_debtors");
    const highlands = result.ledger?.hospitals.find((hospital) => hospital.hospitalId === "case_highlands");
    assert.equal(highlands?.financialCoverage, "pending");
    assert.equal(highlands?.ccnAtEvent, null);
    const community = result.ledger?.observations.filter((item) => item.domain === "community") ?? [];
    assert.ok(community.every((item) => item.historicalFeatureEligible === false));
    assert.ok(result.ledger?.events.every((event) => event.sources.every((source) => source.historicallyEligible === false)));
  });

  it("rejects malformed evidence and null entries", () => {
    assert.equal(adaptEvidencePack(null).ok, false);
    const pack = validPack();
    (pack.events as unknown[]).push(null);
    const result = adaptEvidencePack(pack);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((error) => error.code === "MALFORMED_INPUT" && error.message.includes("null")));
  });

  it("rejects dangling hospital and source references", () => {
    const pack = validPack();
    const events = pack.events as Record<string, unknown>[];
    events[0] = { ...events[0], hospital_id: "missing_hospital", source_ids: ["missing_source"] };
    const result = adaptEvidencePack(pack);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((error) => error.code === "DANGLING_REFERENCE" && error.message.includes("missing_hospital")));
    assert.ok(result.errors.some((error) => error.code === "DANGLING_REFERENCE" && error.message.includes("missing_source")));
  });

  it("accepts unknown announcement dates and rejects an impossible day", () => {
    const pack = validPack();
    const events = pack.events as Record<string, unknown>[];
    assert.equal(events[0].announcement_date, null);
    const accepted = adaptEvidencePack(pack);
    assert.equal(accepted.ok, true);
    events[0] = { ...events[0], effective_date: "2019-02-30", effective_date_precision: "day" };
    const rejected = adaptEvidencePack(pack);
    assert.equal(rejected.ok, false);
    assert.ok(rejected.errors.some((error) => error.code === "INVALID_DATE"));
  });

  it("rejects a day-precision claim on a month-only date", () => {
    const pack = validPack();
    const events = pack.events as Record<string, unknown>[];
    const saleIndex = events.findIndex((event) => event.event_id === "kr_property_sale_2021");
    events[saleIndex] = { ...events[saleIndex], effective_date_precision: "day" };
    const result = adaptEvidencePack(pack);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((error) => error.message.includes("does not match declared precision")));
  });

  it("rejects treating a null publication date as historically eligible", () => {
    const pack = validPack();
    const observations = pack.observations as Record<string, unknown>[];
    observations[0] = { ...observations[0], historical_feature_eligible: true, publication_date: null };
    const result = adaptEvidencePack(pack);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((error) => error.message.includes("not historical eligibility")));
  });
});
