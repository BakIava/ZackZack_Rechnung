"use server";

import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

type DocType = "rechnung" | "angebot";

/** Eingefrorene Kundenkopie im Dokument. Nie als Live-Join – immer Kopie. */
interface CustomerSnapshot {
  name: string;
  street: string | null;
  street_no: string | null;
  postcode: string | null;
  city: string | null;
  email: string | null;
  phone: string | null;
}

async function getCompanyCtx() {
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
  return { companyId: data.company_id as string, userId: user.id, supabase };
}

/**
 * Neuesten leeren Entwurf (ohne Positionen) der Firma finden – falls vorhanden.
 * Verhindert, dass „Neue Rechnung" bei jedem Klick Duplikate anlegt.
 */
async function findReusableDraft(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
): Promise<string | null> {
  const { data: drafts } = await supabase
    .from("documents")
    .select("id")
    .eq("company_id", companyId)
    .eq("status", "draft")
    .order("created_at", { ascending: false });
  if (!drafts || drafts.length === 0) return null;

  const ids = drafts.map((d) => d.id as string);
  const { data: itemRows } = await supabase
    .from("document_items")
    .select("document_id")
    .eq("company_id", companyId)
    .in("document_id", ids);
  const hasItems = new Set((itemRows ?? []).map((r) => r.document_id as string));

  const reusable = drafts.find((d) => !hasItems.has(d.id as string));
  return reusable ? (reusable.id as string) : null;
}

/**
 * Öffnet einen bestehenden leeren Entwurf wieder oder legt einen neuen an und
 * gibt dessen id zurück. §19-Status wird als Snapshot aus den Firmen-
 * Einstellungen übernommen (in Schritt 2 pro Rechnung überschreibbar). Keine
 * Rechnungsnummer – die wird erst bei der Finalisierung vergeben.
 */
export async function createDraftDocument(): Promise<
  { id: string } | { error: string }
> {
  const ctx = await getCompanyCtx();
  if ("error" in ctx) return { error: "notAuthenticated" };

  // Bestehenden leeren Entwurf wiederverwenden statt Duplikate anzulegen.
  const reusable = await findReusableDraft(ctx.supabase, ctx.companyId);
  if (reusable) return { id: reusable };

  const { data: company } = await ctx.supabase
    .from("companies")
    .select("kleinunternehmer")
    .eq("id", ctx.companyId)
    .maybeSingle();
  const isKleinunternehmer = company?.kleinunternehmer ?? true;

  const { data, error } = await ctx.supabase
    .from("documents")
    .insert({
      company_id: ctx.companyId,
      created_by: ctx.userId,
      document_type: "invoice",
      status: "draft",
      is_kleinunternehmer: isKleinunternehmer,
      customer_snapshot: {},
      total_amount: 0,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[createDraftDocument] insert failed:", error);
    return { error: error?.message ?? "unknown" };
  }
  return { id: data.id as string };
}

/**
 * Flow-Einstieg: Draft anlegen und direkt in Schritt 1 springen.
 * Als `<form action>` nutzbar (POST → keine Prefetch-Nebenwirkungen).
 */
export async function startNewDocument(): Promise<void> {
  const res = await createDraftDocument();
  const locale = await getLocale();
  if ("error" in res) redirect(`/${locale}/documents`);
  redirect(`/${locale}/create/${res.id}/1`);
}

/** Dokumenttyp direkt in den Draft schreiben (Schalter in Schritt 1). */
export async function updateDraftDocumentType(
  documentId: string,
  docType: DocType,
): Promise<{ error?: string }> {
  const ctx = await getCompanyCtx();
  if ("error" in ctx) return { error: "notAuthenticated" };

  const { error } = await ctx.supabase
    .from("documents")
    .update({ document_type: docType === "rechnung" ? "invoice" : "quote" })
    .eq("id", documentId)
    .eq("company_id", ctx.companyId)
    .eq("status", "draft");

  if (error) return { error: error.message };
  return {};
}

/**
 * Kundenwahl in Schritt 1 festschreiben: customer_id + eingefrorener Snapshot,
 * issue_date auf heute (nur falls noch nicht gesetzt).
 */
export async function updateDraftCustomer(
  documentId: string,
  customerId: string,
): Promise<{ error?: string }> {
  const ctx = await getCompanyCtx();
  if ("error" in ctx) return { error: "notAuthenticated" };

  const { data: customer } = await ctx.supabase
    .from("customers")
    .select("name, street, street_no, postcode, city, email, phone")
    .eq("id", customerId)
    .eq("company_id", ctx.companyId)
    .maybeSingle();
  if (!customer) return { error: "customerNotFound" };

  const snapshot: CustomerSnapshot = {
    name: customer.name as string,
    street: (customer.street as string | null) ?? null,
    street_no: (customer.street_no as string | null) ?? null,
    postcode: (customer.postcode as string | null) ?? null,
    city: (customer.city as string | null) ?? null,
    email: (customer.email as string | null) ?? null,
    phone: (customer.phone as string | null) ?? null,
  };

  const { data: doc } = await ctx.supabase
    .from("documents")
    .select("issue_date")
    .eq("id", documentId)
    .eq("company_id", ctx.companyId)
    .eq("status", "draft")
    .maybeSingle();
  if (!doc) return { error: "draftNotFound" };

  const update: {
    customer_id: string;
    customer_snapshot: CustomerSnapshot;
    issue_date?: string;
  } = { customer_id: customerId, customer_snapshot: snapshot };
  if (!doc.issue_date) {
    update.issue_date = new Date().toISOString().split("T")[0];
  }

  const { error } = await ctx.supabase
    .from("documents")
    .update(update)
    .eq("id", documentId)
    .eq("company_id", ctx.companyId)
    .eq("status", "draft");

  if (error) return { error: error.message };
  return {};
}

/**
 * Löscht den Draft nur, wenn er wirklich leer ist – d. h. keine Positionen hat.
 * Der Kunde allein macht einen Entwurf nicht wertvoll (in Schritt 1 in Sekunden
 * neu gewählt); der eigentliche Inhalt sind die Positionen. Sobald mindestens
 * eine Position existiert, bleibt der Entwurf erhalten.
 */
export async function deleteDraftIfEmpty(documentId: string): Promise<void> {
  const ctx = await getCompanyCtx();
  if ("error" in ctx) return;

  const { count, error } = await ctx.supabase
    .from("document_items")
    .select("id", { count: "exact", head: true })
    .eq("document_id", documentId)
    .eq("company_id", ctx.companyId);
  if (error) return; // im Zweifel behalten
  if ((count ?? 0) > 0) return; // hat Positionen → behalten

  await ctx.supabase
    .from("documents")
    .delete()
    .eq("id", documentId)
    .eq("company_id", ctx.companyId)
    .eq("status", "draft");
}
