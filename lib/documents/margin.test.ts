import { describe, it, expect } from "vitest";
import { computeUnitPrice, computeLineTotal } from "./margin";

describe("computeUnitPrice", () => {
  it("adds a fixed surcharge (cents) to the purchase price", () => {
    expect(computeUnitPrice(20000, 5000, "fixed")).toBe(25000);
  });

  it("applies a percent surcharge in basis points (1250 = 12,50 %)", () => {
    expect(computeUnitPrice(20000, 1250, "percent")).toBe(22500);
  });

  it("rounds percent results to whole cents", () => {
    // 1999 * 1.125 = 2248.875 → 2249
    expect(computeUnitPrice(1999, 1250, "percent")).toBe(2249);
  });

  it("returns the purchase price unchanged for a zero surcharge", () => {
    expect(computeUnitPrice(20000, 0, "percent")).toBe(20000);
    expect(computeUnitPrice(20000, 0, "fixed")).toBe(20000);
  });
});

describe("computeLineTotal", () => {
  it("multiplies unit price by amount and rounds once", () => {
    expect(computeLineTotal(1200, 45)).toBe(54000);
  });

  it("rounds fractional amounts on the line level", () => {
    // 1250 * 2.5 = 3125
    expect(computeLineTotal(1250, 2.5)).toBe(3125);
    // 999 * 1.5 = 1498.5 → 1499
    expect(computeLineTotal(999, 1.5)).toBe(1499);
  });
});
