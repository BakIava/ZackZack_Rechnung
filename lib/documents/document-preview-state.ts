import type {
  DocumentItem,
  DocumentPreview,
  DocumentTotals,
  DraftItem,
  ItemPatch,
  TemporaryDocumentItemInput,
} from "@/types/document";
import { computeUnitPrice } from "@/lib/documents/margin";
import { normalizeAdditionalDescriptionDe } from "@/lib/documents/additional-description";
import {
  calculateDocumentTotals,
  calculateLineAmounts,
  resolveTaxRate,
} from "@/lib/documents/tax";

export const EMPTY_TEMPORARY_DOCUMENT_ITEM: TemporaryDocumentItemInput = {
  descriptionDe: "",
  amount: 0,
  unit: "",
  unitPrice: 0,
};

export const FREE_TEMPORARY_DOCUMENT_ITEM: TemporaryDocumentItemInput = {
  descriptionDe: "",
  amount: 1,
  unit: "m²",
  unitPrice: 0,
};

export const FREMD_TEMPORARY_DOCUMENT_ITEM: TemporaryDocumentItemInput = {
  descriptionDe: "",
  amount: 1,
  unit: "Pauschale",
  unitPrice: 0,
};

/** Entfernt alle internen Einkaufs-/Aufschlagsfelder vor der Kundensicht. */
export function toDocumentItems(items: DraftItem[]): DocumentItem[] {
  return items.map((item) => ({
    position: item.position,
    descriptionDe: item.descriptionDe,
    additionalDescriptionDe: item.additionalDescriptionDe ?? null,
    amount: item.amount,
    unit: item.unit,
    unitPrice: item.unitPrice,
    totalAmount: item.totalAmount,
    taxRate: item.taxRate,
    taxAmount: item.taxAmount,
    grossAmount: item.grossAmount,
  }));
}

/** Aktualisiert die Vorschau ausschließlich mit erfolgreich persistierten Daten. */
export function withPersistedDocumentItems(
  preview: DocumentPreview,
  items: DraftItem[],
  totals: DocumentTotals,
): DocumentPreview {
  return {
    ...preview,
    items: toDocumentItems(items),
    netAmount: totals.netAmount,
    taxAmount: totals.taxAmount,
    totalAmount: totals.grossAmount,
    taxGroups: totals.taxGroups,
  };
}

/**
 * Hängt einen ausschließlich lokalen Eingabestand an die Kundenvorschau an.
 * Die persistente Positionsvalidierung bleibt unberührt; nur hier ist Menge 0
 * für den leeren Startzustand ausdrücklich erlaubt.
 */
export function withTemporaryDocumentItem(
  preview: DocumentPreview,
  input: TemporaryDocumentItemInput,
): DocumentPreview {
  const amount = Number.isFinite(input.amount) && input.amount >= 0
    ? Math.round(input.amount * 100) / 100
    : 0;
  const unitPrice = Number.isSafeInteger(input.unitPrice) && input.unitPrice >= 0
    ? input.unitPrice
    : 0;
  const totalAmount = Math.round(unitPrice * amount);
  const taxRate = preview.defaultTaxRate;
  const taxAmount = Math.round((totalAmount * taxRate) / 100);
  const temporaryItem: DocumentItem = {
    position: preview.items.length + 1,
    descriptionDe: input.descriptionDe,
    additionalDescriptionDe: null,
    amount,
    unit: input.unit,
    unitPrice,
    totalAmount,
    taxRate,
    taxAmount,
    grossAmount: totalAmount + taxAmount,
  };
  const items = [...preview.items, temporaryItem];
  const totals = calculateDocumentTotals(items.map((item) => ({
    netAmount: item.totalAmount,
    taxRate: item.taxRate,
    taxAmount: item.taxAmount,
    grossAmount: item.grossAmount,
  })));

  return {
    ...preview,
    items,
    netAmount: totals.netAmount,
    taxAmount: totals.taxAmount,
    totalAmount: totals.grossAmount,
    taxGroups: totals.taxGroups,
  };
}

/**
 * Projiziert eine noch nicht gespeicherte Bearbeitung in die Kundenvorschau.
 * Preis-, Steuer- und Rundungslogik entspricht dabei dem Server-Action-Pfad.
 */
export function withEditedDocumentItem(
  preview: DocumentPreview,
  item: DraftItem,
  patch: ItemPatch,
): DocumentPreview {
  const amount = patch.amount ?? item.amount;
  const purchasePrice = patch.purchasePrice !== undefined
    ? patch.purchasePrice
    : item.purchasePrice;
  const surcharge = patch.surcharge !== undefined ? patch.surcharge : item.surcharge;
  const surchargeType = patch.surchargeType !== undefined
    ? patch.surchargeType
    : item.surchargeType;
  const isFremd = purchasePrice != null && surchargeType != null;
  const unitPrice = isFremd
    ? computeUnitPrice(purchasePrice, surcharge ?? 0, surchargeType)
    : patch.unitPrice ?? item.unitPrice;
  const taxRateOverridden = patch.taxRate !== undefined
    ? patch.taxRate !== null
    : item.taxRateOverridden;
  const overrideRate = taxRateOverridden
    ? patch.taxRate !== undefined && patch.taxRate !== null
      ? patch.taxRate
      : item.taxRate
    : null;
  const taxRate = resolveTaxRate(preview.defaultTaxRate, overrideRate);

  let line: ReturnType<typeof calculateLineAmounts>;
  try {
    line = calculateLineAmounts(unitPrice, amount, taxRate);
  } catch {
    return preview;
  }

  const editedItem: DocumentItem = {
    position: item.position,
    descriptionDe: patch.descriptionDe ?? item.descriptionDe,
    additionalDescriptionDe: patch.additionalDescriptionDe === undefined
      ? item.additionalDescriptionDe ?? null
      : normalizeAdditionalDescriptionDe(patch.additionalDescriptionDe),
    amount,
    unit: patch.unit ?? item.unit,
    unitPrice,
    totalAmount: line.netAmount,
    taxRate: line.taxRate,
    taxAmount: line.taxAmount,
    grossAmount: line.grossAmount,
  };
  if (!preview.items.some((entry) => entry.position === item.position)) return preview;
  const items = preview.items.map((entry) =>
    entry.position === item.position ? editedItem : entry,
  );

  const totals = calculateDocumentTotals(items.map((entry) => ({
    netAmount: entry.totalAmount,
    taxRate: entry.taxRate,
    taxAmount: entry.taxAmount,
    grossAmount: entry.grossAmount,
  })));
  return {
    ...preview,
    items,
    netAmount: totals.netAmount,
    taxAmount: totals.taxAmount,
    totalAmount: totals.grossAmount,
    taxGroups: totals.taxGroups,
  };
}
