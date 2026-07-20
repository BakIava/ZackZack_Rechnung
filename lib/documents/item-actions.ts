"use server";

import { revalidatePath } from "next/cache";
import { getCurrentCompanyId } from "@/lib/supabase/auth";
import { computeUnitPrice } from "./margin";
import {
  getDraftTaxConfig,
  isDraftDocument,
  setDraftDocumentTotals,
} from "@/lib/repositories/document-drafts";
import {
  deleteDocumentItem,
  getDraftItems,
  getItemDocumentId,
  getItemPricing,
  getNextItemPosition,
  insertDocumentItem,
  listItemPositions,
  setItemPosition,
  updateDocumentItem,
} from "@/lib/repositories/document-items";
import { getServiceSnapshot } from "@/lib/repositories/services";
import type {
  DraftItem,
  FreeItemInput,
  FremdItemInput,
  ItemPatch,
  TaxRate,
} from "@/types/document";
import {
  calculateDocumentTotals,
  calculateLineAmounts,
  resolveTaxRate,
} from "./tax";

export type ItemsResult =
  | { items: DraftItem[]; totals: ReturnType<typeof calculateDocumentTotals> }
  | { error: string };

async function getCtx() {
  const companyId = await getCurrentCompanyId();
  if (!companyId) return { error: "notAuthenticated" as const };
  return { companyId };
}

/** Lücken in der position-Reihenfolge schließen (1..n). */
async function renumber(companyId: string, documentId: string): Promise<void> {
  const rows = await listItemPositions(companyId, documentId);
  for (let i = 0; i < rows.length; i++) {
    const want = i + 1;
    if (rows[i].position !== want) {
      await setItemPosition(companyId, rows[i].id, want);
    }
  }
}

/** Dokument-Summen aus den serverseitig berechneten Zeilenwerten aktualisieren. */
async function recompute(companyId: string, documentId: string): Promise<ItemsResult> {
  const items = await getDraftItems(documentId);
  const totals = calculateDocumentTotals(
    items.map((item) => ({
      netAmount: item.totalAmount,
      taxRate: item.taxRate,
      taxAmount: item.taxAmount,
      grossAmount: item.grossAmount,
    })),
  );
  await setDraftDocumentTotals(companyId, documentId, totals);
  // Router-Cache des gesamten Flow-Layouts invalidieren, damit beim Zurück-
  // navigieren (z. B. Schritt 3 → 2) nicht ein veralteter, positionsloser
  // Server-Render aus dem Client-Cache ausgeliefert wird.
  revalidatePath("/[locale]/create/[document_id]", "layout");
  return { items, totals };
}

function lineValues(unitPrice: number, amount: number, taxRate: TaxRate) {
  try {
    return calculateLineAmounts(unitPrice, amount, taxRate);
  } catch {
    return null;
  }
}

/** Position aus dem Katalog übernehmen. Deutscher Begriff wird gespeichert – nie die Übersetzung. */
export async function addCatalogItem(
  documentId: string,
  serviceId: string,
): Promise<ItemsResult> {
  const ctx = await getCtx();
  if ("error" in ctx) return { error: "notAuthenticated" };
  if (!(await isDraftDocument(documentId))) return { error: "draftNotFound" };

  const svc = await getServiceSnapshot(serviceId);
  if (!svc) return { error: "serviceNotFound" };

  const taxConfig = await getDraftTaxConfig(documentId);
  if (!taxConfig) return { error: "draftNotFound" };

  const unitPrice = svc.default_price ?? 0;
  const amount = 1;
  const taxRate = resolveTaxRate(
    taxConfig.defaultTaxRate,
    null,
  );
  const line = lineValues(unitPrice, amount, taxRate);
  if (!line) return { error: "pricingInvalid" };
  const position = await getNextItemPosition(ctx.companyId, documentId);

  const { error } = await insertDocumentItem(ctx.companyId, documentId, {
    serviceId,
    position,
    descriptionDe: svc.description_de,
    amount,
    unit: svc.unit ?? "",
    unitPrice,
    totalAmount: line.netAmount,
    taxRate: line.taxRate,
    taxRateOverridden: false,
    taxAmount: line.taxAmount,
    grossAmount: line.grossAmount,
  });
  if (error) return { error };
  return recompute(ctx.companyId, documentId);
}

/** Freie Position (ohne Katalog, service_id NULL). */
export async function addFreeItem(
  documentId: string,
  input: FreeItemInput,
): Promise<ItemsResult> {
  const ctx = await getCtx();
  if ("error" in ctx) return { error: "notAuthenticated" };
  if (!(await isDraftDocument(documentId))) return { error: "draftNotFound" };
  if (!input.descriptionDe.trim()) return { error: "descriptionRequired" };

  const taxConfig = await getDraftTaxConfig(documentId);
  if (!taxConfig) return { error: "draftNotFound" };
  const taxRate = resolveTaxRate(
    taxConfig.defaultTaxRate,
    null,
  );
  const line = lineValues(input.unitPrice, input.amount, taxRate);
  if (!line) return { error: "pricingInvalid" };

  const position = await getNextItemPosition(ctx.companyId, documentId);
  const { error } = await insertDocumentItem(ctx.companyId, documentId, {
    serviceId: null,
    position,
    descriptionDe: input.descriptionDe.trim(),
    amount: input.amount,
    unit: input.unit,
    unitPrice: input.unitPrice,
    totalAmount: line.netAmount,
    taxRate: line.taxRate,
    taxRateOverridden: false,
    taxAmount: line.taxAmount,
    grossAmount: line.grossAmount,
  });
  if (error) return { error };
  return recompute(ctx.companyId, documentId);
}

/** Fremdleistung: Verkaufspreis aus Einkauf + Aufschlag; interne Felder gespeichert. */
export async function addFremdItem(
  documentId: string,
  input: FremdItemInput,
): Promise<ItemsResult> {
  const ctx = await getCtx();
  if ("error" in ctx) return { error: "notAuthenticated" };
  if (!(await isDraftDocument(documentId))) return { error: "draftNotFound" };
  if (!input.descriptionDe.trim()) return { error: "descriptionRequired" };
  if (input.purchasePrice < 0) return { error: "pricingInvalid" };

  const taxConfig = await getDraftTaxConfig(documentId);
  if (!taxConfig) return { error: "draftNotFound" };

  const unitPrice = computeUnitPrice(
    input.purchasePrice,
    input.surcharge,
    input.surchargeType,
  );
  const position = await getNextItemPosition(ctx.companyId, documentId);
  const taxRate = resolveTaxRate(
    taxConfig.defaultTaxRate,
    null,
  );
  const line = lineValues(unitPrice, input.amount, taxRate);
  if (!line) return { error: "pricingInvalid" };
  const { error } = await insertDocumentItem(ctx.companyId, documentId, {
    serviceId: null,
    position,
    descriptionDe: input.descriptionDe.trim(),
    amount: input.amount,
    unit: input.unit,
    unitPrice,
    totalAmount: line.netAmount,
    taxRate: line.taxRate,
    taxRateOverridden: false,
    taxAmount: line.taxAmount,
    grossAmount: line.grossAmount,
    purchasePrice: input.purchasePrice,
    surcharge: input.surcharge,
    surchargeType: input.surchargeType,
  });
  if (error) return { error };
  return recompute(ctx.companyId, documentId);
}

/** Position bearbeiten. Verkaufspreis wird bei Fremdleistung neu berechnet. */
export async function updateItem(
  itemId: string,
  patch: ItemPatch,
): Promise<ItemsResult> {
  const ctx = await getCtx();
  if ("error" in ctx) return { error: "notAuthenticated" };

  const item = await getItemPricing(itemId);
  if (!item) return { error: "itemNotFound" };

  const documentId = item.documentId;
  if (!(await isDraftDocument(documentId))) return { error: "draftNotFound" };
  if (patch.descriptionDe !== undefined && !patch.descriptionDe.trim()) {
    return { error: "descriptionRequired" };
  }

  const taxConfig = await getDraftTaxConfig(documentId);
  if (!taxConfig) return { error: "draftNotFound" };

  const amount = patch.amount ?? item.amount;
  const purchasePrice =
    patch.purchasePrice !== undefined ? patch.purchasePrice : item.purchasePrice;
  const surcharge =
    patch.surcharge !== undefined ? patch.surcharge : item.surcharge;
  const surchargeType =
    patch.surchargeType !== undefined ? patch.surchargeType : item.surchargeType;

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
  const taxRate = resolveTaxRate(
    taxConfig.defaultTaxRate,
    overrideRate,
  );
  const line = lineValues(unitPrice, amount, taxRate);
  if (!line) return { error: "pricingInvalid" };

  const update: Record<string, unknown> = {
    amount,
    unit_price: unitPrice,
    total_amount: line.netAmount,
    tax_rate: line.taxRate,
    tax_rate_overridden: taxRateOverridden,
    tax_amount: line.taxAmount,
    gross_amount: line.grossAmount,
    purchase_price: isFremd ? purchasePrice : null,
    surcharge: isFremd ? surcharge : null,
    surcharge_type: isFremd ? surchargeType : null,
  };
  if (patch.descriptionDe !== undefined) update.description_de = patch.descriptionDe.trim();
  if (patch.unit !== undefined) update.unit = patch.unit;

  const { error } = await updateDocumentItem(ctx.companyId, itemId, update);
  if (error) return { error };
  return recompute(ctx.companyId, documentId);
}

/** Position löschen und verbleibende Positionen neu durchnummerieren. */
export async function deleteItem(itemId: string): Promise<ItemsResult> {
  const ctx = await getCtx();
  if ("error" in ctx) return { error: "notAuthenticated" };

  const documentId = await getItemDocumentId(itemId);
  if (!documentId) return { error: "itemNotFound" };
  if (!(await isDraftDocument(documentId))) return { error: "draftNotFound" };

  const { error } = await deleteDocumentItem(ctx.companyId, itemId);
  if (error) return { error };

  await renumber(ctx.companyId, documentId);
  return recompute(ctx.companyId, documentId);
}

/** Position um eine Stelle nach oben/unten verschieben. */
export async function moveItem(
  itemId: string,
  direction: "up" | "down",
): Promise<ItemsResult> {
  const ctx = await getCtx();
  if ("error" in ctx) return { error: "notAuthenticated" };

  const documentId = await getItemDocumentId(itemId);
  if (!documentId) return { error: "itemNotFound" };
  if (!(await isDraftDocument(documentId))) return { error: "draftNotFound" };

  const list = await listItemPositions(ctx.companyId, documentId);
  const index = list.findIndex((r) => r.id === itemId);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || target < 0 || target >= list.length) {
    return recompute(ctx.companyId, documentId);
  }

  const a = list[index];
  const b = list[target];
  await setItemPosition(ctx.companyId, a.id, b.position);
  await setItemPosition(ctx.companyId, b.id, a.position);

  return recompute(ctx.companyId, documentId);
}
