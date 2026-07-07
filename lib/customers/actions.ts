"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/supabase/auth";
import type { CustomerInput, CustomerMutationResult, FlowCustomer } from "@/types/customer";

async function getCompanyId(): Promise<{ companyId: string } | { error: string }> {
  const companyId = await getCurrentCompanyId();
  if (!companyId) return { error: "notAuthenticated" };
  return { companyId };
}

export async function createCustomer(
  input: CustomerInput,
): Promise<CustomerMutationResult> {
  if (!input.name.trim()) return { error: "nameRequired" };

  const ctx = await getCompanyId();
  if ("error" in ctx) return ctx;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .insert({
      company_id: ctx.companyId,
      name: input.name.trim(),
      street: input.street?.trim() || null,
      street_no: input.streetNo?.trim() || null,
      postcode: input.postcode?.trim() || null,
      city: input.city?.trim() || null,
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
      notes: input.notes?.trim() || null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  return { id: data.id };
}

export async function updateCustomer(
  id: string,
  input: CustomerInput,
): Promise<CustomerMutationResult> {
  if (!input.name.trim()) return { error: "nameRequired" };

  const ctx = await getCompanyId();
  if ("error" in ctx) return ctx;

  const supabase = await createClient();
  const { error } = await supabase
    .from("customers")
    .update({
      name: input.name.trim(),
      street: input.street?.trim() || null,
      street_no: input.streetNo?.trim() || null,
      postcode: input.postcode?.trim() || null,
      city: input.city?.trim() || null,
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
      notes: input.notes?.trim() || null,
    })
    .eq("id", id)
    .eq("company_id", ctx.companyId);

  if (error) return { error: error.message };
  return {};
}

/**
 * Vollständige Kundendaten für den Edit-Modus im Flow laden (eigene Firma).
 * Bewusst schlank (kein documents-Join) – nur die bearbeitbaren Felder.
 */
export async function getCustomerForEdit(id: string): Promise<FlowCustomer | null> {
  const ctx = await getCompanyId();
  if ("error" in ctx) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("customers")
    .select("id, name, street, street_no, postcode, city, phone, email, notes")
    .eq("id", id)
    .eq("company_id", ctx.companyId)
    .maybeSingle();
  if (!data) return null;

  return {
    id: data.id as string,
    name: (data.name as string) ?? "",
    street: (data.street as string | null) ?? null,
    streetNo: (data.street_no as string | null) ?? null,
    postcode: (data.postcode as string | null) ?? null,
    city: (data.city as string | null) ?? null,
    phone: (data.phone as string | null) ?? null,
    email: (data.email as string | null) ?? null,
    notes: (data.notes as string | null) ?? null,
  };
}

export async function deleteCustomer(id: string): Promise<CustomerMutationResult> {
  const ctx = await getCompanyId();
  if ("error" in ctx) return ctx;

  const supabase = await createClient();
  const { error } = await supabase
    .from("customers")
    .delete()
    .eq("id", id)
    .eq("company_id", ctx.companyId);

  if (error) return { error: error.message };
  return {};
}
