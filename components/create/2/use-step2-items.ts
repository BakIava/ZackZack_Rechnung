"use client";

import { useCallback, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { eurosToCents } from "@/lib/money";
import {
  addCatalogItem,
  addFreeItem,
  addFremdItem,
  deleteItem,
  updateItem,
  type ItemsResult,
} from "@/lib/documents/item-actions";
import { fixedSurchargeForSale, markupPercent } from "@/lib/documents/margin";
import {
  EMPTY_TEMPORARY_DOCUMENT_ITEM,
  withEditedDocumentItem,
  withPersistedDocumentItems,
  withTemporaryDocumentItem,
} from "@/lib/documents/document-preview-state";
import type {
  DocumentPreview,
  DraftItem,
  FreeItemInput,
  FremdItemInput,
  ItemPatch,
  TemporaryDocumentItemInput,
} from "@/types/document";
import type { PadField } from "./number-pad";
import type { PositionEditorState, SheetField } from "./position-sheets";

interface UseStep2ItemsArgs {
  documentId: string;
  initialPreview: DocumentPreview;
  initialItems: DraftItem[];
}

interface ItemPreviewEdit {
  item: DraftItem;
  patch: ItemPatch;
}

function padPatch(item: DraftItem, field: PadField, value: number): ItemPatch | null {
  if (field === "qty") {
    return { amount: Math.max(0, Math.round(value * 100) / 100) || 1 };
  }
  if (field === "price") return { unitPrice: eurosToCents(value) };
  if (item.purchasePrice == null) return null;
  if (field === "markup") {
    return { surcharge: Math.round(value * 100), surchargeType: "percent" };
  }
  if (field === "purchase") {
    const purchasePrice = eurosToCents(value);
    return {
      purchasePrice,
      surcharge: fixedSurchargeForSale(purchasePrice, item.unitPrice),
      surchargeType: "fixed",
    };
  }
  const salePrice = eurosToCents(value);
  return {
    surcharge: fixedSurchargeForSale(item.purchasePrice, salePrice),
    surchargeType: "fixed",
  };
}

export function useStep2Items({
  documentId,
  initialPreview,
  initialItems,
}: UseStep2ItemsArgs) {
  const t = useTranslations("Step2");
  const [items, setItems] = useState<DraftItem[]>(initialItems);
  const [savedPreview, setSavedPreview] = useState<DocumentPreview>(initialPreview);
  const [temporaryItem, setTemporaryItem] = useState<TemporaryDocumentItemInput | null>(null);
  const [itemPreviewEdit, setItemPreviewEdit] = useState<ItemPreviewEdit | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [pad, setPad] = useState<{
    itemId: string;
    field: PadField;
    unit: string;
    name: string;
    initial: string;
  } | null>(null);
  const [editor, setEditor] = useState<{ itemId: string; field: SheetField } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const preview = temporaryItem
    ? withTemporaryDocumentItem(savedPreview, temporaryItem)
    : itemPreviewEdit
      ? withEditedDocumentItem(savedPreview, itemPreviewEdit.item, itemPreviewEdit.patch)
      : savedPreview;

  const activeEditor: PositionEditorState | null = editor
    ? (() => {
        const item = items.find((entry) => entry.id === editor.itemId);
        return item
          ? { item, field: editor.field, vat: item.taxRateOverridden ? item.taxRate : null }
          : null;
      })()
    : null;

  function run(action: () => Promise<ItemsResult>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if ("error" in result) {
        setItemPreviewEdit(null);
        setError(t("itemError"));
        return;
      }
      setItems(result.items);
      setSavedPreview((current) =>
        withPersistedDocumentItems(current, result.items, result.totals),
      );
      setItemPreviewEdit(null);
    });
  }

  const addCatalog = (serviceId: string) => {
    setModalOpen(false);
    setTemporaryItem(null);
    run(() => addCatalogItem(documentId, serviceId));
  };
  const addFree = (input: FreeItemInput) => {
    setModalOpen(false);
    setTemporaryItem(null);
    run(() => addFreeItem(documentId, input));
  };
  const addFremd = (input: FremdItemInput) => {
    setModalOpen(false);
    setTemporaryItem(null);
    run(() => addFremdItem(documentId, input));
  };

  const updateTemporaryItem = useCallback((input: TemporaryDocumentItemInput) => {
    setTemporaryItem(input);
  }, []);

  const openModal = () => {
    setTemporaryItem({ ...EMPTY_TEMPORARY_DOCUMENT_ITEM });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setTemporaryItem(null);
  };

  const openPad = (item: DraftItem, field: PadField) => {
    let initial: string;
    if (field === "qty") {
      initial = String(item.amount).replace(".", ",");
    } else if (field === "markup") {
      const markup =
        item.surchargeType === "percent" && item.surcharge != null
          ? item.surcharge / 100
          : markupPercent(item.purchasePrice ?? 0, item.unitPrice);
      initial = String(markup).replace(".", ",");
    } else {
      const cents = field === "purchase" ? item.purchasePrice ?? 0 : item.unitPrice;
      initial = String(cents / 100).replace(".", ",");
    }
    setPad({ itemId: item.id, field, unit: item.unit, name: item.descriptionDe, initial });
  };

  const previewPad = (value: number) => {
    if (!pad) return;
    const item = items.find((entry) => entry.id === pad.itemId);
    if (!item) return;
    const patch = padPatch(item, pad.field, value);
    if (patch) setItemPreviewEdit({ item, patch });
  };

  const closePad = () => {
    setPad(null);
    setItemPreviewEdit(null);
  };

  const commitPad = (value: number) => {
    if (!pad) return;
    const { itemId, field } = pad;
    const item = items.find((entry) => entry.id === itemId);
    const patch = item ? padPatch(item, field, value) : null;
    setPad(null);
    if (patch) {
      run(() => updateItem(itemId, patch));
    } else {
      setItemPreviewEdit(null);
    }
  };

  const openEditor = (item: DraftItem, field: SheetField) => {
    setEditor({ itemId: item.id, field });
  };

  const previewEditor = (itemId: string, patch: ItemPatch) => {
    const item = items.find((entry) => entry.id === itemId);
    if (item) setItemPreviewEdit({ item, patch });
  };

  const closeEditor = () => {
    setEditor(null);
    setItemPreviewEdit(null);
  };

  return {
    items,
    preview,
    savedPreview,
    pending,
    error,
    modalOpen,
    pad,
    activeEditor,
    openModal,
    closeModal,
    updateTemporaryItem,
    closePad,
    closeEditor,
    addCatalog,
    addFree,
    addFremd,
    remove: (id: string) => run(() => deleteItem(id)),
    editDesc: (item: DraftItem) => openEditor(item, "desc"),
    editAdditionalDescription: (item: DraftItem) => openEditor(item, "additionalDescription"),
    editUnit: (item: DraftItem) => openEditor(item, "unit"),
    editVat: (item: DraftItem) => openEditor(item, "vat"),
    previewPad,
    previewDesc: (itemId: string, value: string) => {
      previewEditor(itemId, { descriptionDe: value });
    },
    previewAdditionalDescription: (itemId: string, value: string) => {
      previewEditor(itemId, { additionalDescriptionDe: value });
    },
    previewUnit: (itemId: string, unit: string) => {
      previewEditor(itemId, { unit });
    },
    previewVat: (itemId: string, vat: DraftItem["taxRate"] | null) => {
      previewEditor(itemId, { taxRate: vat });
    },
    commitDesc: (itemId: string, value: string) => {
      setEditor(null);
      run(() => updateItem(itemId, { descriptionDe: value }));
    },
    commitAdditionalDescription: (itemId: string, value: string) => {
      setEditor(null);
      run(() => updateItem(itemId, { additionalDescriptionDe: value }));
    },
    commitUnit: (itemId: string, unit: string) => {
      setEditor(null);
      run(() => updateItem(itemId, { unit }));
    },
    commitVat: (itemId: string, vat: DraftItem["taxRate"] | null) => {
      setEditor(null);
      run(() => updateItem(itemId, { taxRate: vat }));
    },
    openPad,
    commitPad,
  };
}
