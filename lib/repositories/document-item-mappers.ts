import type { DocumentItem, DraftItem, TaxRate } from "@/types/document";

/** Dokumentansicht ohne interne Einkaufs- und Aufschlagsdaten. */
export function toDocumentItem(row: Record<string, unknown>): DocumentItem {
  return {
    position: row.position as number,
    descriptionDe: (row.description_de as string) ?? "",
    additionalDescriptionDe: (row.additional_description_de as string | null) ?? null,
    amount: Number(row.amount ?? 0),
    unit: (row.unit as string) ?? "",
    unitPrice: (row.unit_price as number) ?? 0,
    totalAmount: (row.total_amount as number) ?? 0,
    taxRate: (row.tax_rate as TaxRate | null) ?? 0,
    taxAmount: (row.tax_amount as number | null) ?? 0,
    grossAmount:
      (row.gross_amount as number | null) ?? (row.total_amount as number) ?? 0,
  };
}

/** Bearbeitungsansicht mit den weiterhin strikt internen Preisfeldern. */
export function toDraftItem(row: Record<string, unknown>): DraftItem {
  return {
    id: row.id as string,
    serviceId: (row.service_id as string | null) ?? null,
    ...toDocumentItem(row),
    taxRateOverridden: Boolean(row.tax_rate_overridden),
    purchasePrice: (row.purchase_price as number | null) ?? null,
    surcharge: (row.surcharge as number | null) ?? null,
    surchargeType: (row.surcharge_type as DraftItem["surchargeType"]) ?? null,
  };
}
