import { createClient } from "@/lib/supabase/server";

/**
 * Entwurf samt Positionen löschen – atomar über die SQL-Funktion
 * `delete_draft_document` (scripts/delete_draft_document.sql). Die Funktion
 * prüft Firma, Status, fehlende Nummer und Verknüpfungen selbst.
 */
export async function deleteDraftDocumentRpc(
  documentId: string,
): Promise<{ errorMessage?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_draft_document", {
    p_document_id: documentId,
  });
  if (error) return { errorMessage: error.message };
  return {};
}
