/**
 * Preis-/Margenberechnung für document_items. Alles in ganzzahligen Cents.
 *
 * HARD RULE (Fremdleistung): Einkaufspreis (purchasePrice) und Aufschlag
 * (surcharge) sind strikt intern. Nur der berechnete Verkaufspreis (unitPrice)
 * darf jemals auf das Dokument/PDF gelangen.
 */

import type { SurchargeType } from "@/types/database";

/**
 * Verkaufspreis (unit_price) aus Einkaufspreis + Aufschlag.
 * - fixed:   unitPrice = purchasePrice + surcharge   (surcharge in Cents)
 * - percent: unitPrice = round(purchasePrice * (1 + surcharge/10000))
 *            (surcharge in Basispunkten: 1250 = 12,50 %)
 */
export function computeUnitPrice(
  purchasePrice: number,
  surcharge: number,
  surchargeType: SurchargeType,
): number {
  if (surchargeType === "fixed") {
    return purchasePrice + surcharge;
  }
  return Math.round(purchasePrice * (1 + surcharge / 10000));
}

/**
 * Zeilensumme aus Einzelpreis und Menge. Rundung nur einmal, auf Zeilenebene.
 * unitPrice in Cents, amount numerisch.
 */
export function computeLineTotal(unitPrice: number, amount: number): number {
  return Math.round(unitPrice * amount);
}

/**
 * Fester Aufschlag (Cents), damit `computeUnitPrice(purchase, x, "fixed")` exakt
 * den gewünschten Verkaufspreis ergibt. Wird beim direkten Anpassen von Einkauf
 * bzw. Verkaufspreis in Schritt 2 gespeichert (Verkaufspreis ist maßgeblich –
 * „Kunde zahlt" bleibt centgenau, der Aufschlag ergibt sich).
 * Beide Werte in Cents; Ergebnis kann negativ sein (Verkauf < Einkauf).
 */
export function fixedSurchargeForSale(
  purchasePrice: number,
  salePrice: number,
): number {
  return salePrice - purchasePrice;
}

/**
 * Aufschlag als ganzzahlige Prozent – rein zur internen Anzeige
 * („Nur für dich"). Strikt intern; erreicht niemals Dokument/PDF.
 * 0 %, wenn kein Einkaufspreis vorliegt.
 */
export function markupPercent(
  purchasePrice: number,
  salePrice: number,
): number {
  if (purchasePrice <= 0) return 0;
  return Math.round((salePrice / purchasePrice - 1) * 100);
}
