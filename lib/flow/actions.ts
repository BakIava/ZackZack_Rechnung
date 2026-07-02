"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { FlowDocType } from "./types";

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
  return { supabase, userId: user.id, companyId: data.company_id as string };
}

export async function createDraftDocument(locale: string): Promise<void> {
  const ctx = await getCompanyCtx();
  if ("error" in ctx) redirect(`/${locale}/login`);

  const { data: company } = await ctx.supabase
    .from("companies")
    .select("kleinunternehmer")
    .eq("id", ctx.companyId)
    .maybeSingle();

  const { data, error } = await ctx.supabase
    .from("documents")
    .insert({
      company_id: ctx.companyId,
      created_by: ctx.userId,
      document_type: "invoice",
      status: "draft",
      is_kleinunternehmer: company?.kleinunternehmer ?? true,
      customer_snapshot: {},
      total_amount: 0,
    })
    .select("id")
    .single();

  if (error || !data) redirect(`/${locale}/documents`);
  redirect(`/${locale}/flow/${data.id}/schritt-1`);
}

export async function updateDocumentType(
  documentId: string,
  docType: FlowDocType,
): Promise<{ error?: string }> {
  const ctx = await getCompanyCtx();
  if ("error" in ctx) return ctx;

  const { error } = await ctx.supabase
    .from("documents")
    .update({ document_type: docType })
    .eq("id", documentId)
    .eq("company_id", ctx.companyId)
    .eq("status", "draft");

  if (error) return { error: error.message };
  return {};
}

export interface NewCustomerInput {
  name: string;
  street?: string;
  postcode?: string;
  city?: string;
  phone?: string;
  email?: string;
}

export async function createCustomerForFlow(
  input: NewCustomerInput,
): Promise<{ id?: string; name?: string; error?: string }> {
  if (!input.name.trim()) return { error: "nameRequired" };

  const ctx = await getCompanyCtx();
  if ("error" in ctx) return ctx;

  const { data, error } = await ctx.supabase
    .from("customers")
    .insert({
      company_id: ctx.companyId,
      name: input.name.trim(),
      street: input.street?.trim() || null,
      postcode: input.postcode?.trim() || null,
      city: input.city?.trim() || null,
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
    })
    .select("id, name, street, street_no, postcode, city, email, phone, customer_number")
    .single();

  if (error) return { error: error.message };
  return { id: data.id, name: data.name };
}

export async function saveStep1(
  documentId: string,
  customerId: string,
  locale: string,
): Promise<{ error?: string }> {
  const ctx = await getCompanyCtx();
  if ("error" in ctx) return ctx;

  const [customerRes, docRes] = await Promise.all([
    ctx.supabase
      .from("customers")
      .select("name, street, street_no, postcode, city, email, phone")
      .eq("id", customerId)
      .eq("company_id", ctx.companyId)
      .maybeSingle(),
    ctx.supabase
      .from("documents")
      .select("issue_date")
      .eq("id", documentId)
      .eq("company_id", ctx.companyId)
      .maybeSingle(),
  ]);

  if (!customerRes.data) return { error: "customerNotFound" };

  const c = customerRes.data;
  const snapshot = {
    name: c.name,
    street: c.street ?? null,
    street_no: c.street_no ?? null,
    postcode: c.postcode ?? null,
    city: c.city ?? null,
    email: c.email ?? null,
    phone: c.phone ?? null,
  };

  const updates: Record<string, unknown> = {
    customer_id: customerId,
    customer_snapshot: snapshot,
  };

  if (!docRes.data?.issue_date) {
    updates.issue_date = new Date().toISOString().split("T")[0];
  }

  const { error } = await ctx.supabase
    .from("documents")
    .update(updates)
    .eq("id", documentId)
    .eq("company_id", ctx.companyId)
    .eq("status", "draft");

  if (error) return { error: error.message };
  redirect(`/${locale}/flow/${documentId}/schritt-2`);
}

export async function cancelDraft(
  documentId: string,
  locale: string,
): Promise<void> {
  const raw = await getCompanyCtx();
  const documentsUrl = `/${locale}/documents`;
  if ("error" in raw) redirect(documentsUrl);

  const ctx = raw as Exclude<typeof raw, { error: string }>;

  const { data: doc } = await ctx.supabase
    .from("documents")
    .select("customer_id, total_amount")
    .eq("id", documentId)
    .eq("company_id", ctx.companyId)
    .eq("status", "draft")
    .maybeSingle();

  if (doc && doc.customer_id === null && (doc.total_amount ?? 0) === 0) {
    await ctx.supabase
      .from("documents")
      .delete()
      .eq("id", documentId)
      .eq("company_id", ctx.companyId)
      .eq("status", "draft")
      .is("customer_id", null);
  }

  redirect(documentsUrl);
}
