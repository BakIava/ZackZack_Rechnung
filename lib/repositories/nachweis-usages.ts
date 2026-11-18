/**
 * Repository für die Warnung vor Doppelabrechnung: Welche Dokumente der Firma
 * tragen schon Positionen mit dieser Nachweis-Nummer im Zusatztext?
 * Kein eigenes Feld – gesucht wird im vorhandenen `additional_description_de`.
 */

import { createClient } from "@/lib/supabase/server";

/** Rohtreffer; die Action prüft die Nummer exakt und blendet Stornos aus. */
interface NachweisUsageRow {
  documentId: string;
  additionalDescriptionDe: string;
  docType: "invoice" | "quote";
  documentNumber: string | null;
  status: string;
}

export async function findDocumentsMentioningNachweis(
  companyId: string,
  likePattern: string,
): Promise<NachweisUsageRow[]> {
  const supabase = await createClient();
  const { data: items, error } = await supabase
    .from("document_items")
    .select("document_id, additional_description_de")
    .eq("company_id", companyId)
    .ilike("additional_description_de", likePattern)
    .limit(50);
  if (error || !items?.length) return [];

  const documentIds = [...new Set(items.map((item) => item.document_id as string))];
  const { data: documents } = await supabase
    .from("documents")
    .select("id, document_type, document_number, status")
    .eq("company_id", companyId)
    .in("id", documentIds);
  const byId = new Map((documents ?? []).map((document) => [document.id as string, document]));

  return items.flatMap((item): NachweisUsageRow[] => {
    const document = byId.get(item.document_id as string);
    if (!document) return [];
    return [{
      documentId: document.id as string,
      additionalDescriptionDe: (item.additional_description_de as string | null) ?? "",
      docType: document.document_type === "quote" ? "quote" : "invoice",
      documentNumber: (document.document_number as string | null) ?? null,
      status: document.status as string,
    }];
  });
}
