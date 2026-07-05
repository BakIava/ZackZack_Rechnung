import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/supabase/auth";
import { deriveInitials } from "@/lib/initials";
import type { DraftContext, DraftItem } from "./item-types";

/** Positionen eines Drafts, sortiert nach position. */
export async function getDraftItems(documentId: string): Promise<DraftItem[]> {
  const companyId = await getCurrentCompanyId();
  if (!companyId) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("document_items")
    .select(
      "id, service_id, position, description_de, amount, unit, unit_price, total_amount, purchase_price, surcharge, surcharge_type",
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
    purchasePrice: (r.purchase_price as number | null) ?? null,
    surcharge: (r.surcharge as number | null) ?? null,
    surchargeType: (r.surcharge_type as DraftItem["surchargeType"]) ?? null,
  }));
}

/** Kopf-Kontext des Drafts (Typ, Kunde, §19) für Schritt 2. */
export async function getDraftContext(
  documentId: string,
): Promise<DraftContext | null> {
  const companyId = await getCurrentCompanyId();
  if (!companyId) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("documents")
    .select("document_type, customer_snapshot, is_kleinunternehmer")
    .eq("id", documentId)
    .eq("company_id", companyId)
    .eq("status", "draft")
    .maybeSingle();

  if (!data) return null;

  const snapshot = data.customer_snapshot as { name?: string } | null;
  const customerName = snapshot?.name?.trim() || "";

  return {
    docType: data.document_type === "quote" ? "angebot" : "rechnung",
    customerName,
    customerInitials: customerName ? deriveInitials(customerName) : "—",
    isKleinunternehmer: Boolean(data.is_kleinunternehmer),
  };
}
