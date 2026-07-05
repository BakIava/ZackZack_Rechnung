"use server";

import { createClient } from "@/lib/supabase/server";

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
  return { companyId: data.company_id, supabase };
}

export async function markDocumentAsPaid(documentId: string): Promise<{ error?: string }> {
  const ctx = await getCompanyCtx();
  if ("error" in ctx) return ctx;

  const { error } = await ctx.supabase
    .from("documents")
    .update({ 
      status: "paid",
      paid_at: new Date().toISOString() 
    })
    .eq("id", documentId)
    .eq("company_id", ctx.companyId);

  if (error) return { error: error.message };
  return {};
}
