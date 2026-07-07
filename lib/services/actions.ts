"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/supabase/auth";
import type { ServiceInput } from "@/types/service";

type MutationResult = { id?: string; error?: string };

async function getCompanyId(): Promise<{ companyId: string } | { error: string }> {
  const companyId = await getCurrentCompanyId();
  if (!companyId) return { error: "notAuthenticated" };
  return { companyId };
}


export async function createService(input: ServiceInput): Promise<MutationResult> {
  if (!input.description_de.trim()) return { error: "deRequired" };

  const ctx = await getCompanyId();
  if ("error" in ctx) return ctx;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("services")
    .insert({
      company_id: ctx.companyId,
      description_de: input.description_de.trim(),
      description_tr: input.description_tr?.trim() || null,
      description_ar: input.description_ar?.trim() || null,
      unit: input.unit?.trim() || null,
      default_price: input.default_price ?? null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  return { id: data.id };
}

export async function updateService(id: string, input: ServiceInput): Promise<MutationResult> {
  if (!input.description_de.trim()) return { error: "deRequired" };

  const ctx = await getCompanyId();
  if ("error" in ctx) return ctx;

  const supabase = await createClient();
  const { error } = await supabase
    .from("services")
    .update({
      description_de: input.description_de.trim(),
      description_tr: input.description_tr?.trim() || null,
      description_ar: input.description_ar?.trim() || null,
      unit: input.unit?.trim() || null,
      default_price: input.default_price ?? null,
    })
    .eq("id", id)
    .eq("company_id", ctx.companyId);

  if (error) return { error: error.message };
  return {};
}

export async function deleteService(id: string): Promise<MutationResult> {
  const ctx = await getCompanyId();
  if ("error" in ctx) return ctx;

  const supabase = await createClient();
  const { error } = await supabase
    .from("services")
    .delete()
    .eq("id", id)
    .eq("company_id", ctx.companyId);

  if (error) return { error: error.message };
  return {};
}
