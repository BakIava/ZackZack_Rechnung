"use server";

import { applyDraftItemSelection } from "@/lib/repositories/document-item-selection";
import type { DocumentTotals, DraftItem, DraftItemBatchChange } from "@/types/document";
import { getItemContext, revalidateDraftItems } from "./item-write";
import { calculateDocumentTotals, isTaxRate } from "./tax";

export type BulkItemError =
  | "notAuthenticated"
  | "draftNotFound"
  | "selectionInvalid"
  | "selectionChanged"
  | "bulkSaveFailed"
  | "bulkOutcomeUnknown";

export type BulkItemsResult =
  | { items: DraftItem[]; totals: DocumentTotals }
  | { error: BulkItemError };

const UUID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

function normalizedItemIds(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const ids = new Set<string>();
  for (const id of value) {
    if (typeof id !== "string" || !UUID.test(id)) return null;
    ids.add(id.toLowerCase());
  }
  return ids.size === value.length ? [...ids] : null;
}

function parseChange(value: unknown): DraftItemBatchChange | null {
  if (typeof value !== "object" || value === null || !("kind" in value)) return null;
  if (value.kind === "delete") return { kind: "delete" };
  if (value.kind !== "vat" || !("taxRate" in value)) return null;
  const { taxRate } = value;
  return taxRate === null || isTaxRate(taxRate) ? { kind: "vat", taxRate } : null;
}

export async function changeSelectedDraftItems(
  documentId: string,
  itemIds: unknown,
  change: unknown,
): Promise<BulkItemsResult> {
  const context = await getItemContext();
  if (!context.companyId) return { error: "notAuthenticated" };
  const ids = normalizedItemIds(itemIds);
  const operation = parseChange(change);
  if (typeof documentId !== "string" || !UUID.test(documentId) || !ids || !operation) {
    return { error: "selectionInvalid" };
  }

  try {
    const result = await applyDraftItemSelection(documentId, ids, operation);
    if ("error" in result) return result;
    const totals = calculateDocumentTotals(result.items.map((item) => ({
      netAmount: item.totalAmount,
      taxAmount: item.taxAmount,
      grossAmount: item.grossAmount,
      taxRate: item.taxRate,
    })));
    revalidateDraftItems();
    return { items: result.items, totals };
  } catch {
    return { error: "bulkOutcomeUnknown" };
  }
}
