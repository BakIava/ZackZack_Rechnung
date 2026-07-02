"use server";

import { createClient } from "@/lib/supabase/server";
import type { CustomerMutationResult } from "./types";

async function getCompanyId(): Promise<{ companyId: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "notAuthenticated" };

  const { data: profile } = await supabase
    .from("users")
    .select("company_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) return { error: "notAuthenticated" };
  return { companyId: profile.company_id };
}

export interface CustomerInput {
  name: string;
  street?: string;
  postcode?: string;
  city?: string;
  phone?: string;
  email?: string;
  notes?: string;
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
