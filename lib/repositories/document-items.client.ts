/**
 * Client-Variante des `document_items`-Repositories: der einzige
 * Browser-seitige Supabase-Read (Positionsliste im Dokument-Detail).
 * Nutzt bewusst den Browser-Client (@supabase/ssr) – RLS scoped auf die Firma.
 */

import { createClient } from "@/lib/supabase/client";
import type { DocumentItem } from "@/types/document";
import { toDocumentItem } from "./document-item-mappers";

/** Positionen eines Dokuments für die Detailansicht, sortiert nach position. */
export async function getDocumentItems(documentId: string): Promise<DocumentItem[]> {
  const client = createClient();
  const { data } = await client
    .from("document_items")
    .select("position, description_de, additional_description_de, amount, unit, unit_price, total_amount, tax_rate, tax_amount, gross_amount")
    .eq("document_id", documentId)
    .order("position", { ascending: true });

  return (data ?? []).map((r) => toDocumentItem(r));
}
