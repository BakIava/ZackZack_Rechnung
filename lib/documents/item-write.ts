/**
 * Gemeinsame Schreibhelfer der Positions-Actions (`item-actions.ts`,
 * `nachweis-actions.ts`). Bewusst kein `"use server"`: diese Funktionen
 * dürfen nicht als Server-Actions aufrufbar sein.
 */

import { revalidatePath } from "next/cache";
import { getCurrentCompanyId } from "@/lib/supabase/auth";
import { setDraftDocumentTotals } from "@/lib/repositories/document-drafts";
import { getDraftItems } from "@/lib/repositories/document-items";
import type { DraftItem, TaxRate } from "@/types/document";
import { calculateDocumentTotals, calculateLineAmounts } from "./tax";

export type ItemsResult =
  | { items: DraftItem[]; totals: ReturnType<typeof calculateDocumentTotals> }
  | { error: string };

export async function getItemContext() {
  const companyId = await getCurrentCompanyId();
  if (!companyId) return { error: "notAuthenticated" as const };
  return { companyId };
}

/** Dokument-Summen aus den serverseitig berechneten Zeilenwerten aktualisieren. */
export async function recomputeDraftItems(
  companyId: string,
  documentId: string,
  persistTotals = true,
  requireSuccess = false,
): Promise<ItemsResult> {
  const items = await getDraftItems(documentId, requireSuccess);
  const totals = calculateDocumentTotals(
    items.map((item) => ({
      netAmount: item.totalAmount,
      taxRate: item.taxRate,
      taxAmount: item.taxAmount,
      grossAmount: item.grossAmount,
    })),
  );
  if (persistTotals) await setDraftDocumentTotals(companyId, documentId, totals, requireSuccess);
  // Router-Cache des gesamten Flow-Layouts invalidieren, damit beim Zurück-
  // navigieren (z. B. Schritt 3 → 2) nicht ein veralteter, positionsloser
  // Server-Render aus dem Client-Cache ausgeliefert wird.
  revalidateDraftItems();
  return { items, totals };
}

export function revalidateDraftItems(): void {
  revalidatePath("/[locale]/create/[document_id]", "layout");
}

export function lineValues(unitPrice: number, amount: number, taxRate: TaxRate) {
  try {
    return calculateLineAmounts(unitPrice, amount, taxRate);
  } catch {
    return null;
  }
}
