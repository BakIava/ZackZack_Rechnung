import { createClient } from "@/lib/supabase/server";
import type { DraftItem, DraftItemBatchChange } from "@/types/document";
import { toDraftItem } from "./document-item-mappers";

const bulkItemErrors = {
  bulk_items_not_authenticated: "notAuthenticated",
  bulk_items_draft_not_found: "draftNotFound",
  bulk_items_selection_changed: "selectionChanged",
  bulk_items_invalid: "selectionInvalid",
} as const;

type BulkWriteError = (typeof bulkItemErrors)[keyof typeof bulkItemErrors] | "bulkSaveFailed" | "bulkOutcomeUnknown";

function parseBulkItems(response: unknown): DraftItem[] | null {
  if (!Array.isArray(response)) return null;
  const items: DraftItem[] = [];
  const rows: unknown[] = response;
  for (const row of rows) {
    if (row === null || typeof row !== "object" || !("id" in row) || typeof row.id !== "string") return null;
    items.push(toDraftItem(row));
  }
  return items;
}

/** Die Transaktion prüft Session/Mandant und liefert die aktualisierte Positionsliste zurück. */
export async function applyDraftItemSelection(
  documentId: string,
  ids: string[],
  change: DraftItemBatchChange,
): Promise<{ items: DraftItem[] } | { error: BulkWriteError }> {
  const supabase = await createClient();
  const { data, error, status } = await supabase.rpc("apply_draft_item_selection", {
    p_document_id: documentId,
    p_item_ids: ids,
    p_action: change.kind,
    p_tax_rate: change.kind === "vat" ? change.taxRate : null,
  });
  if (error) {
    for (const [message, code] of Object.entries(bulkItemErrors)) {
      if (message === error.message) return { error: code };
    }
    return { error: status === 0 || status >= 500 ? "bulkOutcomeUnknown" : "bulkSaveFailed" };
  }

  const items = parseBulkItems(data);
  return items ? { items } : { error: "bulkOutcomeUnknown" };
}
