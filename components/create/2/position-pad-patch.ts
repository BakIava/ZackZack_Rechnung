import { fixedSurchargeForSale } from "@/lib/documents/margin";
import { eurosToCents } from "@/lib/money";
import type { DraftItem, ItemPatch } from "@/types/document";
import type { PadField } from "./number-pad";

export function padPatch(item: DraftItem, field: PadField, value: number): ItemPatch | null {
  if (field === "qty") {
    return { amount: Math.max(0, Math.round(value * 100) / 100) || 1 };
  }
  // Negativer Preis = Abzug.
  if (field === "price") return { unitPrice: eurosToCents(value) };
  if (item.purchasePrice == null) return null;
  // Fremdleistung: Einkauf und Aufschlag beschreiben immer den positiven Betrag;
  // das Vorzeichen (Abzug) bleibt erhalten bzw. kommt aus dem Verkaufspreis.
  if (field === "markup") {
    return { surcharge: Math.round(value * 100), surchargeType: "percent" };
  }
  if (field === "purchase") {
    const purchasePrice = eurosToCents(value);
    return {
      purchasePrice,
      surcharge: fixedSurchargeForSale(purchasePrice, Math.abs(item.unitPrice)),
      surchargeType: "fixed",
    };
  }
  const salePrice = eurosToCents(value);
  return {
    surcharge: fixedSurchargeForSale(item.purchasePrice, Math.abs(salePrice)),
    surchargeType: "fixed",
    deduction: salePrice < 0,
  };
}
