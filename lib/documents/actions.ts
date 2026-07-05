"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/supabase/auth";

async function getCompanyCtx() {
  const companyId = await getCurrentCompanyId();
  if (!companyId) return { error: "notAuthenticated" as const };

  const supabase = await createClient();
  return { companyId, supabase };
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
