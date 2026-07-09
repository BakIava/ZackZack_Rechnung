/**
 * Client-Variante des `document_items`-Repositories: der einzige
 * Browser-seitige Supabase-Read (Positionsliste im Dokument-Detail).
 * Nutzt bewusst den Browser-Client (@supabase/ssr) – RLS scoped auf die Firma.
 */

import { createClient } from "@/lib/supabase/client";
import type { DocumentItem } from "@/types/document";

/** Positionen eines Dokuments für die Detailansicht, sortiert nach position. */
export async function getDocumentItems(documentId: string): Promise<DocumentItem[]> {
  const client = createClient();
  const { data } = await client
    .from("document_items")
    .select("position, description_de, amount, unit, unit_price, total_amount")
    .eq("document_id", documentId)
    .order("position", { ascending: true });

  return (data ?? []).map((r) => ({
    position: r.position,
    descriptionDe: r.description_de,
    amount: r.amount,
    unit: r.unit,
    unitPrice: r.unit_price,
    totalAmount: r.total_amount,
  }));
}
