import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { contrastRatio, evidenceDate, money, moneyExact, moneyHeadline, ratio, shortFiscalRange } from "../src/ui/format.ts";

describe("display formatting", () => {
  it("does not render a very small valid liquidity ratio as zero", () => {
    assert.equal(ratio(0.0008387), "0.0008");
    assert.equal(ratio(1.1), "1.10");
  });

  it("shows small cash amounts exactly instead of a rounded thousands label", () => {
    assert.equal(money(18207), "$18,207");
    assert.equal(money(27544800), "$27.5M");
  });

  it("keeps the minus sign on exact Ask currency", () => {
    assert.equal(moneyExact(-155304), "-$155,304");
    assert.equal(moneyExact(0), "$0");
  });

  it("rounds headline money without dropping the exact statement value", () => {
    assert.equal(moneyHeadline(35283871), "$35.3 million");
    assert.equal(shortFiscalRange("2023-09-01", "2024-08-31"), "Sep 2023 – Aug 2024");
  });

  it("labels month-precision dates", () => {
    assert.equal(evidenceDate("2021-09", "month"), "2021-09 (month precision)");
    assert.equal(evidenceDate(null), "Unknown");
  });

  it("keeps body and status text above WCAG AA contrast on the Option A palette", () => {
    assert.ok(contrastRatio("#193E34", "#F8F8F2") >= 7);
    assert.ok(contrastRatio("#185C46", "#F8F8F2") >= 4.5);
    assert.ok(contrastRatio("#FFFFFF", "#185C46") >= 4.5);
    assert.ok(contrastRatio("#8E3A3D", "#F6E4E4") >= 4.5);
    assert.ok(contrastRatio("#7A5110", "#F4E6C4") >= 4.5);
    assert.ok(contrastRatio("#4F615A", "#F8F8F2") >= 4.5);
  });
});
