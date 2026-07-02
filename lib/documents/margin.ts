/**
 * Preis-/Margenberechnung für document_items. Alles in ganzzahligen Cents.
 *
 * HARD RULE (Fremdleistung): Einkaufspreis (purchasePrice) und Aufschlag
 * (surcharge) sind strikt intern. Nur der berechnete Verkaufspreis (unitPrice)
 * darf jemals auf das Dokument/PDF gelangen.
 */

import type { SurchargeType } from "./item-types";

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
