import { describe, it, expect } from "vitest";
import {
  computeUnitPrice,
  computeLineTotal,
  fixedSurchargeForSale,
  markupPercent,
  surchargeBasisPointsForSale,
} from "./margin";

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

describe("fixedSurchargeForSale", () => {
  it("is the difference between sale and purchase (cents)", () => {
    expect(fixedSurchargeForSale(20000, 25000)).toBe(5000);
  });

  it("round-trips exactly through computeUnitPrice (fixed)", () => {
    const purchase = 19999;
    const sale = 25001;
    const surcharge = fixedSurchargeForSale(purchase, sale);
    expect(computeUnitPrice(purchase, surcharge, "fixed")).toBe(sale);
  });

  it("can be negative when sale is below purchase", () => {
    expect(fixedSurchargeForSale(20000, 18000)).toBe(-2000);
    expect(computeUnitPrice(20000, -2000, "fixed")).toBe(18000);
  });
});

describe("surchargeBasisPointsForSale", () => {
  it("computes a percentage surcharge from purchase and sale", () => {
    expect(surchargeBasisPointsForSale(20000, 22500)).toBe(1250);
  });

  it("keeps two decimal places of percentage precision", () => {
    expect(surchargeBasisPointsForSale(12000, 13333)).toBe(1111);
  });

  it("supports a sale below purchase and an absent purchase price", () => {
    expect(surchargeBasisPointsForSale(20000, 18000)).toBe(-1000);
    expect(surchargeBasisPointsForSale(0, 18000)).toBe(0);
  });
});

describe("markupPercent", () => {
  it("computes the whole-percent markup from purchase and sale", () => {
    expect(markupPercent(20000, 25000)).toBe(25);
  });

  it("rounds to the nearest whole percent", () => {
    // 25001 / 20000 - 1 = 0.250050 → 25 %
    expect(markupPercent(20000, 25001)).toBe(25);
    // 23000 / 20000 - 1 = 0.15 → 15 %
    expect(markupPercent(20000, 23000)).toBe(15);
  });

  it("is negative when the sale is below the purchase", () => {
    expect(markupPercent(20000, 18000)).toBe(-10);
  });

  it("returns 0 without a purchase price", () => {
    expect(markupPercent(0, 25000)).toBe(0);
  });
});
