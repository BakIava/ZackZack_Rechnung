/**
 * Repository `document_items` — einzige Stelle mit Supabase-Zugriff auf die
 * Positionszeilen (Server). Preisberechnung (Marge etc.) passiert NICHT hier,
 * sondern in `lib/documents/` – dieses Modul liest/schreibt nur Zeilen.
 */

import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/supabase/auth";
import type { DraftItem, SurchargeType, TaxRate } from "@/types/document";

/** Positionen eines Drafts, sortiert nach position. */
export async function getDraftItems(documentId: string): Promise<DraftItem[]> {
  const companyId = await getCurrentCompanyId();
  if (!companyId) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("document_items")
    .select(
      "id, service_id, position, description_de, amount, unit, unit_price, total_amount, tax_rate, tax_rate_overridden, tax_amount, gross_amount, purchase_price, surcharge, surcharge_type",
    )
    .eq("document_id", documentId)
    .eq("company_id", companyId)
    .order("position", { ascending: true });

  if (error || !data) return [];

  return data.map((r) => ({
    id: r.id as string,
    serviceId: (r.service_id as string | null) ?? null,
    position: r.position as number,
    descriptionDe: (r.description_de as string) ?? "",
    amount: Number(r.amount ?? 0),
    unit: (r.unit as string) ?? "",
    unitPrice: (r.unit_price as number) ?? 0,
    totalAmount: (r.total_amount as number) ?? 0,
    taxRate: (r.tax_rate as TaxRate | null) ?? 0,
    taxRateOverridden: Boolean(r.tax_rate_overridden),
    taxAmount: (r.tax_amount as number | null) ?? 0,
    grossAmount: (r.gross_amount as number | null) ?? (r.total_amount as number) ?? 0,
    purchasePrice: (r.purchase_price as number | null) ?? null,
    surcharge: (r.surcharge as number | null) ?? null,
    surchargeType: (r.surcharge_type as DraftItem["surchargeType"]) ?? null,
  }));
}
/** Welche der übergebenen Dokumente haben mindestens eine Position? */
export async function getDocumentIdsWithItems(
  companyId: string,
  documentIds: string[],
): Promise<Set<string>> {
  const supabase = await createClient();
  const { data: itemRows } = await supabase
    .from("document_items")
    .select("document_id")
    .eq("company_id", companyId)
    .in("document_id", documentIds);
  return new Set((itemRows ?? []).map((r) => r.document_id as string));
}

/** Anzahl Positionen eines Dokuments; null bei Fehler (Aufrufer entscheidet). */
export async function countDocumentItems(documentId: string): Promise<number | null> {
  const companyId = await getCurrentCompanyId();
  if (!companyId) return null;

  const supabase = await createClient();
  const { count, error } = await supabase
    .from("document_items")
    .select("id", { count: "exact", head: true })
    .eq("document_id", documentId)
    .eq("company_id", companyId);
  if (error) return null;
  return count ?? 0;
}

/** Nächste freie position (1-basiert, lückenlos ans Ende anfügen). */
export async function getNextItemPosition(
  companyId: string,
  documentId: string,
): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("document_items")
    .select("position")
    .eq("document_id", documentId)
    .eq("company_id", companyId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  return ((data?.position as number | undefined) ?? 0) + 1;
}

/** Neue Positionszeile. Deutscher Begriff wird gespeichert – nie die Übersetzung. */
export async function insertDocumentItem(
  companyId: string,
  documentId: string,
  item: {
    serviceId: string | null;
    position: number;
    descriptionDe: string;
    amount: number;
    unit: string;
    unitPrice: number;
    totalAmount: number;
    taxRate: TaxRate;
    taxRateOverridden: boolean;
    taxAmount: number;
    grossAmount: number;
    purchasePrice?: number;
    surcharge?: number;
    surchargeType?: SurchargeType;
  },
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const row: Record<string, unknown> = {
    document_id: documentId,
    company_id: companyId,
    service_id: item.serviceId,
    position: item.position,
    description_de: item.descriptionDe,
    amount: item.amount,
    unit: item.unit,
    unit_price: item.unitPrice,
    total_amount: item.totalAmount,
    tax_rate: item.taxRate,
    tax_rate_overridden: item.taxRateOverridden,
    tax_amount: item.taxAmount,
    gross_amount: item.grossAmount,
  };
  if (item.purchasePrice !== undefined) row.purchase_price = item.purchasePrice;
  if (item.surcharge !== undefined) row.surcharge = item.surcharge;
  if (item.surchargeType !== undefined) row.surcharge_type = item.surchargeType;

  const { error } = await supabase.from("document_items").insert(row);
  if (error) return { error: error.message };
  return {};
}

/** Zeile + Preisfelder für die Neuberechnung beim Bearbeiten. */
export async function getItemPricing(itemId: string): Promise<{
  documentId: string;
  amount: number;
  unitPrice: number;
  purchasePrice: number | null;
  surcharge: number | null;
  surchargeType: SurchargeType | null;
  taxRate: TaxRate;
  taxRateOverridden: boolean;
} | null> {
  const companyId = await getCurrentCompanyId();
  if (!companyId) return null;

  const supabase = await createClient();
  const { data: item } = await supabase
    .from("document_items")
    .select(
      "document_id, amount, unit_price, purchase_price, surcharge, surcharge_type, tax_rate, tax_rate_overridden",
    )
    .eq("id", itemId)
    .eq("company_id", companyId)
    .maybeSingle();
  if (!item) return null;

  return {
    documentId: item.document_id as string,
    amount: item.amount as number,
    unitPrice: item.unit_price as number,
    purchasePrice: (item.purchase_price as number | null) ?? null,
    surcharge: (item.surcharge as number | null) ?? null,
    surchargeType: (item.surcharge_type as SurchargeType | null) ?? null,
    taxRate: (item.tax_rate as TaxRate | null) ?? 0,
    taxRateOverridden: Boolean(item.tax_rate_overridden),
  };
}

/** document_id einer Position (Zugehörigkeits-Lookup für Löschen/Verschieben). */
export async function getItemDocumentId(itemId: string): Promise<string | null> {
  const companyId = await getCurrentCompanyId();
  if (!companyId) return null;

  const supabase = await createClient();
  const { data: item } = await supabase
    .from("document_items")
    .select("document_id")
    .eq("id", itemId)
    .eq("company_id", companyId)
    .maybeSingle();
  return item ? (item.document_id as string) : null;
}

/** Positionszeile aktualisieren (Patch mit DB-Spaltennamen, vom Aufrufer berechnet). */
export async function updateDocumentItem(
  companyId: string,
  itemId: string,
  update: Record<string, unknown>,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("document_items")
    .update(update)
    .eq("id", itemId)
    .eq("company_id", companyId);
  if (error) return { error: error.message };
  return {};
}

/** Positionszeile löschen. */
export async function deleteDocumentItem(
  companyId: string,
  itemId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("document_items")
    .delete()
    .eq("id", itemId)
    .eq("company_id", companyId);
  if (error) return { error: error.message };
  return {};
}

/** Alle Positionen (id + position) eines Dokuments, sortiert. */
export async function listItemPositions(
  companyId: string,
  documentId: string,
): Promise<Array<{ id: string; position: number }>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("document_items")
    .select("id, position")
    .eq("document_id", documentId)
    .eq("company_id", companyId)
    .order("position", { ascending: true });
  return (data ?? []) as Array<{ id: string; position: number }>;
}

/** position einer Zeile setzen (Umsortieren/Neunummerieren). */
export async function setItemPosition(
  companyId: string,
  itemId: string,
  position: number,
): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("document_items")
    .update({ position })
    .eq("id", itemId)
    .eq("company_id", companyId);
}
