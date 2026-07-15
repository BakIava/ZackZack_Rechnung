import { describe, expect, it } from "vitest";
import {
  calculateDocumentTotals,
  calculateLineAmounts,
  resolveDocumentDefaultTaxRate,
  resolveTaxRate,
  shouldShowTaxDetails,
} from "./tax";

describe("Umsatzsteuer auf Positionsebene", () => {
  it("berechnet 19 % aus einem Nettopreis", () => {
    expect(calculateLineAmounts(10_000, 2, 19)).toEqual({
      netAmount: 20_000,
      taxRate: 19,
      taxAmount: 3_800,
      grossAmount: 23_800,
    });
  });

  it("rundet erst den Zeilennettobetrag und dann die Zeilensteuer", () => {
    expect(calculateLineAmounts(333, 1.5, 19)).toEqual({
      netAmount: 500,
      taxRate: 19,
      taxAmount: 95,
      grossAmount: 595,
    });
  });

  it("gruppiert gemischte Sätze aus den gerundeten Zeilenwerten", () => {
    const totals = calculateDocumentTotals([
      calculateLineAmounts(10_000, 1, 19),
      calculateLineAmounts(5_000, 1, 7),
      calculateLineAmounts(2_000, 1, 0),
    ]);
    expect(totals).toEqual({
      netAmount: 17_000,
      taxAmount: 2_250,
      grossAmount: 19_250,
      taxGroups: [
        { rate: 19, netAmount: 10_000, taxAmount: 1_900 },
        { rate: 7, netAmount: 5_000, taxAmount: 350 },
        { rate: 0, netAmount: 2_000, taxAmount: 0 },
      ],
    });
  });

  it("löst den Dokumentstandard auf und erlaubt Positionsüberschreibungen", () => {
    expect(resolveDocumentDefaultTaxRate(19, true)).toBe(0);
    expect(resolveDocumentDefaultTaxRate(19, false)).toBe(19);
    expect(resolveTaxRate(0, null)).toBe(0);
    expect(resolveTaxRate(0, 7)).toBe(7);
    expect(resolveTaxRate(0, 19)).toBe(19);
    expect(resolveTaxRate(19, null)).toBe(19);
  });

  it("blendet Steuerdetails bei §19 nur für positive Positionssteuersätze ein", () => {
    expect(shouldShowTaxDetails(true, [{ taxRate: 0 }])).toBe(false);
    expect(shouldShowTaxDetails(true, [{ taxRate: 0 }, { taxRate: 7 }])).toBe(true);
    expect(shouldShowTaxDetails(true, [{ taxRate: 19 }])).toBe(true);
    expect(shouldShowTaxDetails(false, [{ taxRate: 0 }])).toBe(true);
  });

  it("erlaubt Nullpreise, aber keine negativen Preise oder Mengen", () => {
    expect(calculateLineAmounts(0, 1, 19).grossAmount).toBe(0);
    expect(() => calculateLineAmounts(-1, 1, 19)).toThrow("unit_price_invalid");
    expect(() => calculateLineAmounts(100, 0, 19)).toThrow("amount_invalid");
    expect(() => calculateLineAmounts(100, -1, 19)).toThrow("amount_invalid");
  });

  it("begrenzt Mengen auf zwei Nachkommastellen", () => {
    expect(() => calculateLineAmounts(100, 1.001, 19)).toThrow(
      "amount_precision_invalid",
    );
  });
});
