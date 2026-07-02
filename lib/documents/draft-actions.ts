"use server";

import { createClient } from "@/lib/supabase/server";

type DocType = "rechnung" | "angebot";

interface CustomerSnapshot {
  id: string;
  name: string;
  street: string | null;
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

export async function createDraft(): Promise<{ id: string } | { error: string }> {
  const ctx = await getCompanyCtx();
  if ("error" in ctx) return { error: "notAuthenticated" };

  const today = new Date().toISOString().split("T")[0];
  const { data, error } = await ctx.supabase
    .from("documents")
    .insert({
      company_id: ctx.companyId,
      created_by: ctx.userId,
      document_type: "invoice",
      status: "draft",
      issue_date: today,
      total_amount: 0,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[createDraft] insert failed:", error);
    return { error: error?.message ?? "unknown" };
  }
  return { id: data.id as string };
}

export async function updateDraftCustomer(
  documentId: string,
  customerId: string,
  docType: DocType,
): Promise<{ error?: string }> {
  const ctx = await getCompanyCtx();
  if ("error" in ctx) return ctx;

  const { data: customer } = await ctx.supabase
    .from("customers")
    .select("id, name, street, street_no, postcode, city, email, phone")
    .eq("id", customerId)
    .eq("company_id", ctx.companyId)
    .maybeSingle();

  if (!customer) return { error: "customerNotFound" };

  const snapshot: CustomerSnapshot = {
    id: customer.id as string,
    name: customer.name as string,
    street:
      [customer.street, customer.street_no].filter(Boolean).join(" ") || null,
    postcode: (customer.postcode as string | null) ?? null,
    city: (customer.city as string | null) ?? null,
    email: (customer.email as string | null) ?? null,
    phone: (customer.phone as string | null) ?? null,
  };

  const { error } = await ctx.supabase
    .from("documents")
    .update({
      // customer_id verknüpft das Dokument mit dem Kunden (Kundendetail-Seite
      // listet Dokumente über diese FK). customer_snapshot bleibt die
      // eingefrorene Quelle der Wahrheit für den Dokumentinhalt.
      customer_id: customerId,
      customer_snapshot: snapshot,
      document_type: docType === "rechnung" ? "invoice" : "quote",
    })
    .eq("id", documentId)
    .eq("company_id", ctx.companyId)
    .eq("status", "draft");

  if (error) return { error: error.message };
  return {};
}

/** Löscht einen leeren Draft (ohne customer_snapshot). Drafts mit Kundendaten bleiben erhalten. */
export async function deleteDraftIfEmpty(documentId: string): Promise<void> {
  const ctx = await getCompanyCtx();
  if ("error" in ctx) return;

  await ctx.supabase
    .from("documents")
    .delete()
    .eq("id", documentId)
    .eq("company_id", ctx.companyId)
    .eq("status", "draft")
    .is("customer_snapshot", null);
}
