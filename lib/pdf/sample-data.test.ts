import { describe, expect, it } from "vitest";
import { sampleInvoiceData } from "./sample-data";

describe("Document DTO – hard rules", () => {
  it("uses integer cents for every amount (no float euros)", () => {
    for (const item of sampleInvoiceData.lineItems) {
      expect(Number.isInteger(item.unitPriceCents)).toBe(true);
      expect(Number.isInteger(item.quantity)).toBe(true);
    }
  });

  it("never leaks Einkaufspreis or Marge into the document DTO", () => {
    const serialized = JSON.stringify(sampleInvoiceData).toLowerCase();
    expect(serialized).not.toContain("einkauf");
    expect(serialized).not.toContain("marge");
    expect(serialized).not.toContain("aufschlag");

    for (const item of sampleInvoiceData.lineItems) {
      const keys = Object.keys(item);
      expect(keys).not.toContain("einkaufCents");
      expect(keys).not.toContain("margeCents");
    }
  });
});
