import { describe, expect, it } from "vitest";
import {
  calculateDocumentTotals,
  calculateLineAmounts,
  hasNegativeTotals,
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

  it("erlaubt Nullpreise und Abzüge, aber keine negativen oder leeren Mengen", () => {
    expect(calculateLineAmounts(0, 1, 19).grossAmount).toBe(0);
    expect(() => calculateLineAmounts(-1.5, 1, 19)).toThrow("unit_price_invalid");
    expect(() => calculateLineAmounts(100, 0, 19)).toThrow("amount_invalid");
    expect(() => calculateLineAmounts(100, -1, 19)).toThrow("amount_invalid");
    expect(() => calculateLineAmounts(-100, -1, 19)).toThrow("amount_invalid");
  });

  it("berechnet einen Abzug mit negativem Netto, Steuer und Brutto", () => {
    // z. B. „abzüglich Abschlagsrechnung R-2026-005" in der Schlussrechnung
    expect(calculateLineAmounts(-200_000, 1, 0)).toEqual({
      netAmount: -200_000,
      taxRate: 0,
      taxAmount: 0,
      grossAmount: -200_000,
    });
    expect(calculateLineAmounts(-10_000, 1, 19)).toEqual({
      netAmount: -10_000,
      taxRate: 19,
      taxAmount: -1_900,
      grossAmount: -11_900,
    });
  });

  it("rundet Abzüge wie Postgres round(): ,5 vom Nullpunkt weg", () => {
    // Netto: −1999 × 0,5 = −999,5 → −1000 (Math.round ergäbe −999)
    expect(calculateLineAmounts(-1_999, 0.5, 0).netAmount).toBe(-1_000);
    expect(calculateLineAmounts(1_999, 0.5, 0).netAmount).toBe(1_000);
    // Steuer: −1050 × 19 % = −199,5 → −200
    expect(calculateLineAmounts(-1_050, 1, 19).taxAmount).toBe(-200);
    expect(calculateLineAmounts(1_050, 1, 19).taxAmount).toBe(200);
  });

  it("ein Abzug ist das exakte Spiegelbild derselben positiven Position", () => {
    for (const [price, amount, rate] of [
      [1_999, 0.5, 19],
      [333, 3, 7],
      [1_050, 1.25, 19],
      [12_345, 2.75, 7],
    ] as const) {
      const positive = calculateLineAmounts(price, amount, rate);
      const negative = calculateLineAmounts(-price, amount, rate);
      expect(negative.netAmount).toBe(-positive.netAmount);
      expect(negative.taxAmount).toBe(-positive.taxAmount);
      expect(negative.grossAmount).toBe(-positive.grossAmount);
    }
  });

  it("verrechnet Abzüge in Belegsumme und Steuergruppe", () => {
    const totals = calculateDocumentTotals([
      calculateLineAmounts(500_000, 1, 19),
      calculateLineAmounts(-200_000, 1, 19),
    ]);
    expect(totals).toEqual({
      netAmount: 300_000,
      taxAmount: 57_000,
      grossAmount: 357_000,
      taxGroups: [{ rate: 19, netAmount: 300_000, taxAmount: 57_000 }],
    });
    expect(hasNegativeTotals(totals)).toBe(false);
  });

  it("erkennt negative Belegsummen – auch eine negative Steuer bei positivem Brutto", () => {
    const zero = calculateDocumentTotals([
      calculateLineAmounts(200_000, 1, 0),
      calculateLineAmounts(-200_000, 1, 0),
    ]);
    expect(zero.grossAmount).toBe(0);
    expect(hasNegativeTotals(zero)).toBe(false);

    const negative = calculateDocumentTotals([
      calculateLineAmounts(100_000, 1, 0),
      calculateLineAmounts(-150_000, 1, 0),
    ]);
    expect(hasNegativeTotals(negative)).toBe(true);

    // §19-Positionen zu 0 % plus ein Abzug zu 19 %: Brutto positiv, Steuer negativ.
    const mixed = calculateDocumentTotals([
      calculateLineAmounts(100_000, 1, 0),
      calculateLineAmounts(-50_000, 1, 19),
    ]);
    expect(mixed.grossAmount).toBe(40_500);
    expect(mixed.taxAmount).toBe(-9_500);
    expect(hasNegativeTotals(mixed)).toBe(true);
  });

  it("begrenzt Mengen auf zwei Nachkommastellen", () => {
    expect(() => calculateLineAmounts(100, 1.001, 19)).toThrow(
      "amount_precision_invalid",
    );
  });
});
