"use server";

import { createClient } from "@/lib/supabase/server";
import { computeLineTotal, computeUnitPrice } from "./margin";
import { getDraftItems } from "./item-queries";
import type {
  DraftItem,
  FreeItemInput,
  FremdItemInput,
  ItemPatch,
} from "./item-types";

type DB = Awaited<ReturnType<typeof createClient>>;

export type ItemsResult = { items: DraftItem[]; total: number } | { error: string };

async function getCtx() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "notAuthenticated" as const };
  const { data } = await supabase
    .from("users")
    .select("company_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!data?.company_id) return { error: "notAuthenticated" as const };
  return { companyId: data.company_id as string, supabase };
}

async function isDraft(db: DB, companyId: string, documentId: string): Promise<boolean> {
  const { data } = await db
    .from("documents")
    .select("id")
    .eq("id", documentId)
    .eq("company_id", companyId)
    .eq("status", "draft")
    .maybeSingle();
  return Boolean(data);
}

async function nextPosition(db: DB, companyId: string, documentId: string): Promise<number> {
  const { data } = await db
    .from("document_items")
    .select("position")
    .eq("document_id", documentId)
    .eq("company_id", companyId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  return ((data?.position as number | undefined) ?? 0) + 1;
}

/** Lücken in der position-Reihenfolge schließen (1..n). */
async function renumber(db: DB, companyId: string, documentId: string): Promise<void> {
  const { data } = await db
    .from("document_items")
    .select("id, position")
    .eq("document_id", documentId)
    .eq("company_id", companyId)
    .order("position", { ascending: true });
  const rows = data ?? [];
  for (let i = 0; i < rows.length; i++) {
    const want = i + 1;
    if (rows[i].position !== want) {
      await db
        .from("document_items")
        .update({ position: want })
        .eq("id", rows[i].id)
        .eq("company_id", companyId);
    }
  }
}

/** document.total_amount = Summe aller Positionen; danach frische Liste liefern. */
async function recompute(db: DB, companyId: string, documentId: string): Promise<ItemsResult> {
  const { data } = await db
    .from("document_items")
    .select("total_amount")
    .eq("document_id", documentId)
    .eq("company_id", companyId);
  const total = (data ?? []).reduce(
    (sum, r) => sum + ((r.total_amount as number | null) ?? 0),
    0,
  );
  await db
    .from("documents")
    .update({ total_amount: total })
    .eq("id", documentId)
    .eq("company_id", companyId)
    .eq("status", "draft");
  const items = await getDraftItems(documentId);
  return { items, total };
}

/** Position aus dem Katalog übernehmen. Deutscher Begriff wird gespeichert – nie die Übersetzung. */
export async function addCatalogItem(
  documentId: string,
  serviceId: string,
): Promise<ItemsResult> {
  const ctx = await getCtx();
  if ("error" in ctx) return { error: "notAuthenticated" };
  if (!(await isDraft(ctx.supabase, ctx.companyId, documentId)))
    return { error: "draftNotFound" };

  const { data: svc } = await ctx.supabase
    .from("services")
    .select("description_de, unit, default_price")
    .eq("id", serviceId)
    .eq("company_id", ctx.companyId)
    .maybeSingle();
  if (!svc) return { error: "serviceNotFound" };

  const unitPrice = (svc.default_price as number | null) ?? 0;
  const amount = 1;
  const position = await nextPosition(ctx.supabase, ctx.companyId, documentId);

  const { error } = await ctx.supabase.from("document_items").insert({
    document_id: documentId,
    company_id: ctx.companyId,
    service_id: serviceId,
    position,
    description_de: svc.description_de as string,
    amount,
    unit: (svc.unit as string | null) ?? "",
    unit_price: unitPrice,
    total_amount: computeLineTotal(unitPrice, amount),
  });
  if (error) return { error: error.message };
  return recompute(ctx.supabase, ctx.companyId, documentId);
}

/** Freie Position (ohne Katalog, service_id NULL). */
export async function addFreeItem(
  documentId: string,
  input: FreeItemInput,
): Promise<ItemsResult> {
  const ctx = await getCtx();
  if ("error" in ctx) return { error: "notAuthenticated" };
  if (!(await isDraft(ctx.supabase, ctx.companyId, documentId)))
    return { error: "draftNotFound" };
  if (!input.descriptionDe.trim()) return { error: "descriptionRequired" };

  const position = await nextPosition(ctx.supabase, ctx.companyId, documentId);
  const { error } = await ctx.supabase.from("document_items").insert({
    document_id: documentId,
    company_id: ctx.companyId,
    service_id: null,
    position,
    description_de: input.descriptionDe.trim(),
    amount: input.amount,
    unit: input.unit,
    unit_price: input.unitPrice,
    total_amount: computeLineTotal(input.unitPrice, input.amount),
  });
  if (error) return { error: error.message };
  return recompute(ctx.supabase, ctx.companyId, documentId);
}

/** Fremdleistung: Verkaufspreis aus Einkauf + Aufschlag; interne Felder gespeichert. */
export async function addFremdItem(
  documentId: string,
  input: FremdItemInput,
): Promise<ItemsResult> {
  const ctx = await getCtx();
  if ("error" in ctx) return { error: "notAuthenticated" };
  if (!(await isDraft(ctx.supabase, ctx.companyId, documentId)))
    return { error: "draftNotFound" };
  if (!input.descriptionDe.trim()) return { error: "descriptionRequired" };

  const unitPrice = computeUnitPrice(
    input.purchasePrice,
    input.surcharge,
    input.surchargeType,
  );
  const position = await nextPosition(ctx.supabase, ctx.companyId, documentId);
  const { error } = await ctx.supabase.from("document_items").insert({
    document_id: documentId,
    company_id: ctx.companyId,
    service_id: null,
    position,
    description_de: input.descriptionDe.trim(),
    amount: input.amount,
    unit: input.unit,
    unit_price: unitPrice,
    total_amount: computeLineTotal(unitPrice, input.amount),
    purchase_price: input.purchasePrice,
    surcharge: input.surcharge,
    surcharge_type: input.surchargeType,
  });
  if (error) return { error: error.message };
  return recompute(ctx.supabase, ctx.companyId, documentId);
}

/** Position bearbeiten. Verkaufspreis wird bei Fremdleistung neu berechnet. */
export async function updateItem(
  itemId: string,
  patch: ItemPatch,
): Promise<ItemsResult> {
  const ctx = await getCtx();
  if ("error" in ctx) return { error: "notAuthenticated" };

  const { data: item } = await ctx.supabase
    .from("document_items")
    .select(
      "document_id, amount, unit_price, purchase_price, surcharge, surcharge_type",
    )
    .eq("id", itemId)
    .eq("company_id", ctx.companyId)
    .maybeSingle();
  if (!item) return { error: "itemNotFound" };

  const documentId = item.document_id as string;
  if (!(await isDraft(ctx.supabase, ctx.companyId, documentId)))
    return { error: "draftNotFound" };

  const amount = patch.amount ?? (item.amount as number);
  const purchasePrice =
    patch.purchasePrice !== undefined
      ? patch.purchasePrice
      : (item.purchase_price as number | null);
  const surcharge =
    patch.surcharge !== undefined ? patch.surcharge : (item.surcharge as number | null);
  const surchargeType =
    patch.surchargeType !== undefined
      ? patch.surchargeType
      : (item.surcharge_type as ItemPatch["surchargeType"]);

  const isFremd = purchasePrice != null && surchargeType != null;
  const unitPrice = isFremd
    ? computeUnitPrice(purchasePrice, surcharge ?? 0, surchargeType)
    : patch.unitPrice ?? (item.unit_price as number);

  const update: Record<string, unknown> = {
    amount,
    unit_price: unitPrice,
    total_amount: computeLineTotal(unitPrice, amount),
    purchase_price: isFremd ? purchasePrice : null,
    surcharge: isFremd ? surcharge : null,
    surcharge_type: isFremd ? surchargeType : null,
  };
  if (patch.descriptionDe !== undefined) update.description_de = patch.descriptionDe.trim();
  if (patch.unit !== undefined) update.unit = patch.unit;

  const { error } = await ctx.supabase
    .from("document_items")
    .update(update)
    .eq("id", itemId)
    .eq("company_id", ctx.companyId);
  if (error) return { error: error.message };
  return recompute(ctx.supabase, ctx.companyId, documentId);
}

/** Position löschen und verbleibende Positionen neu durchnummerieren. */
export async function deleteItem(itemId: string): Promise<ItemsResult> {
  const ctx = await getCtx();
  if ("error" in ctx) return { error: "notAuthenticated" };

  const { data: item } = await ctx.supabase
    .from("document_items")
    .select("document_id")
    .eq("id", itemId)
    .eq("company_id", ctx.companyId)
    .maybeSingle();
  if (!item) return { error: "itemNotFound" };
  const documentId = item.document_id as string;
  if (!(await isDraft(ctx.supabase, ctx.companyId, documentId)))
    return { error: "draftNotFound" };

  const { error } = await ctx.supabase
    .from("document_items")
    .delete()
    .eq("id", itemId)
    .eq("company_id", ctx.companyId);
  if (error) return { error: error.message };

  await renumber(ctx.supabase, ctx.companyId, documentId);
  return recompute(ctx.supabase, ctx.companyId, documentId);
}

/** Position um eine Stelle nach oben/unten verschieben. */
export async function moveItem(
  itemId: string,
  direction: "up" | "down",
): Promise<ItemsResult> {
  const ctx = await getCtx();
  if ("error" in ctx) return { error: "notAuthenticated" };

  const { data: item } = await ctx.supabase
    .from("document_items")
    .select("document_id")
    .eq("id", itemId)
    .eq("company_id", ctx.companyId)
    .maybeSingle();
  if (!item) return { error: "itemNotFound" };
  const documentId = item.document_id as string;
  if (!(await isDraft(ctx.supabase, ctx.companyId, documentId)))
    return { error: "draftNotFound" };

  const { data: rows } = await ctx.supabase
    .from("document_items")
    .select("id, position")
    .eq("document_id", documentId)
    .eq("company_id", ctx.companyId)
    .order("position", { ascending: true });
  const list = rows ?? [];
  const index = list.findIndex((r) => r.id === itemId);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || target < 0 || target >= list.length) {
    return recompute(ctx.supabase, ctx.companyId, documentId);
  }

  const a = list[index];
  const b = list[target];
  await ctx.supabase
    .from("document_items")
    .update({ position: b.position })
    .eq("id", a.id)
    .eq("company_id", ctx.companyId);
  await ctx.supabase
    .from("document_items")
    .update({ position: a.position })
    .eq("id", b.id)
    .eq("company_id", ctx.companyId);

  return recompute(ctx.supabase, ctx.companyId, documentId);
}
