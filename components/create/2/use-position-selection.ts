"use client";

import { useRef, useState } from "react";
import type { BulkItemError, BulkItemsResult } from "@/lib/documents/item-bulk-actions";
import type { DraftItem, DraftItemBatchChange } from "@/types/document";

type BatchKind = DraftItemBatchChange["kind"];

export function usePositionSelection(
  items: DraftItem[],
  onApply: (ids: string[], change: DraftItemBatchChange) => Promise<BulkItemsResult>,
) {
  const [ids, setIds] = useState<ReadonlySet<string> | null>(null);
  const [dialog, setDialog] = useState<BatchKind | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<BulkItemError | null>(null);
  const saving = useRef(false);

  const selected = ids ? items.filter((item) => ids.has(item.id)) : [];
  const outcomeUnknown = error === "bulkOutcomeUnknown";

  function toggle(id: string) {
    if (saving.current) return;
    setIds((current) => {
      if (!current) return current;
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function closeDialog() {
    if (saving.current) return;
    setDialog(null);
    if (!outcomeUnknown) setError(null);
  }

  function end() {
    if (saving.current) return;
    closeDialog();
    setIds(null);
  }

  function openDialog(action: BatchKind) {
    if (saving.current || outcomeUnknown || selected.length === 0) return;
    setError(null);
    setDialog(action);
  }

  async function submit(change: DraftItemBatchChange) {
    if (saving.current || outcomeUnknown || selected.length === 0 || dialog !== change.kind) return;
    saving.current = true;
    setPending(true);
    setError(null);
    try {
      const result = await onApply(selected.map((item) => item.id), change);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setDialog(null);
      setIds(null);
    } catch {
      setError("bulkOutcomeUnknown");
    } finally {
      saving.current = false;
      setPending(false);
    }
  }

  return {
    ids,
    selected,
    pending,
    error,
    dialog,
    outcomeUnknown,
    start: () => setIds(new Set()),
    end,
    toggle,
    openDialog,
    closeDialog,
    submit,
  };
}
