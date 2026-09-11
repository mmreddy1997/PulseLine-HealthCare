import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evidenceDate, money, ratio } from "../src/ui/format.ts";

describe("display formatting", () => {
  it("does not render a very small valid liquidity ratio as zero", () => {
    assert.equal(ratio(0.0008387), "0.0008");
    assert.equal(ratio(1.1), "1.10");
  });

  it("shows small cash amounts exactly instead of a rounded thousands label", () => {
    assert.equal(money(18207), "$18,207");
    assert.equal(money(27544800), "$27.5M");
  });

  it("labels month-precision dates", () => {
    assert.equal(evidenceDate("2021-09", "month"), "2021-09 (month precision)");
    assert.equal(evidenceDate(null), "Unknown");
  });
});
