import { describe, expect, it } from "vitest";
import { clampScore } from "../src/lib/lead-utils";

describe("clampScore", () => {
  it("keeps score between 0 and 100", () => {
    expect(clampScore(-20)).toBe(0);
    expect(clampScore(50)).toBe(50);
    expect(clampScore(200)).toBe(100);
  });

  it("handles NaN safely", () => {
    expect(clampScore(Number.NaN)).toBe(0);
  });
});
