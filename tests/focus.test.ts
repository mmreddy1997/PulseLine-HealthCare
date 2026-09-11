import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { nextFocusIndex } from "../src/ui/focus.ts";

describe("drawer focus helpers", () => {
  it("wraps Tab and Shift+Tab at the edges of the focus list", () => {
    assert.equal(nextFocusIndex(0, 3, true), 2);
    assert.equal(nextFocusIndex(2, 3, false), 0);
    assert.equal(nextFocusIndex(1, 3, false), 2);
    assert.equal(nextFocusIndex(1, 3, true), 0);
    assert.equal(nextFocusIndex(0, 0, false), -1);
  });
});
