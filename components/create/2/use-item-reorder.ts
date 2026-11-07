"use client";

import { useState, type Dispatch, type SetStateAction, type TransitionStartFunction } from "react";
import { reorderItems } from "@/lib/documents/item-actions";
import { moveToIndex } from "@/lib/documents/item-order";
import { withPersistedDocumentItems } from "@/lib/documents/document-preview-state";
import type { DocumentPreview, DocumentTotals, DraftItem } from "@/types/document";

interface UseItemReorderArgs {
  documentId: string;
  items: DraftItem[];
  savedPreview: DocumentPreview;
  setItems: Dispatch<SetStateAction<DraftItem[]>>;
  setSavedPreview: Dispatch<SetStateAction<DocumentPreview>>;
  setError: (message: string | null) => void;
  startTransition: TransitionStartFunction;
  errorMessage: string;
}

function totalsOf(preview: DocumentPreview): DocumentTotals {
  return {
    netAmount: preview.netAmount,
    taxAmount: preview.taxAmount,
    grossAmount: preview.totalAmount,
    taxGroups: preview.taxGroups,
  };
}

/**
 * Reihenfolge der Positionen ändern – über die Kompaktliste („Reihenfolge
 * ändern") oder direkt per Nummer auf der Karte. Die neue Reihenfolge erscheint
 * sofort; gespeichert wird mit einer einzigen Anfrage, bei Fehler zurückgesetzt.
 */
export function useItemReorder({
  documentId,
  items,
  savedPreview,
  setItems,
  setSavedPreview,
  setError,
  startTransition,
  errorMessage,
}: UseItemReorderArgs) {
  const [reorderOpen, setReorderOpen] = useState(false);
  const [pickerItemId, setPickerItemId] = useState<string | null>(null);
  const pickerItem = items.find((item) => item.id === pickerItemId) ?? null;

  function saveOrder(orderedIds: string[]) {
    setReorderOpen(false);
    setPickerItemId(null);
    if (orderedIds.every((id, index) => items[index]?.id === id)) return;

    const previousItems = items;
    const previousPreview = savedPreview;
    const nextItems = orderedIds
      .map((id) => items.find((item) => item.id === id))
      .filter((item): item is DraftItem => item !== undefined)
      .map((item, index) => ({ ...item, position: index + 1 }));
    setItems(nextItems);
    setSavedPreview((current) =>
      withPersistedDocumentItems(current, nextItems, totalsOf(current)),
    );
    setError(null);

    startTransition(async () => {
      const result = await reorderItems(documentId, orderedIds);
      if ("error" in result) {
        setItems(previousItems);
        setSavedPreview(previousPreview);
        setError(errorMessage);
        return;
      }
      setItems(result.items);
      setSavedPreview((current) =>
        withPersistedDocumentItems(current, result.items, result.totals),
      );
    });
  }

  /** Position direkt an Stelle `targetPosition` (1-basiert) setzen. */
  function moveTo(item: DraftItem, targetPosition: number) {
    const ids = items.map((entry) => entry.id);
    saveOrder(moveToIndex(ids, ids.indexOf(item.id), targetPosition - 1));
  }

  return {
    /** Kompaktliste „Reihenfolge ändern" offen? */
    isOpen: reorderOpen,
    open: () => setReorderOpen(true),
    close: () => setReorderOpen(false),
    /** Position, deren Nummer auf der Karte angetippt wurde. */
    pickerItem,
    openPicker: (item: DraftItem) => setPickerItemId(item.id),
    closePicker: () => setPickerItemId(null),
    save: saveOrder,
    moveTo,
  };
}
