import { parseCustomerAiQuota } from "@/lib/customers/customer-ai-quota";
import { createClient } from "@/lib/supabase/server";
import type { CustomerAiQuota } from "@/types/customer-intake";

export type ConsumeTextAiQuotaResult =
  | { quota: CustomerAiQuota }
  | { error: "quota_unavailable" };

/** Reserviert atomar einen der 50 UTC-Tagesaufrufe für „Text verbessern“. */
export async function consumeTextAiQuota(): Promise<ConsumeTextAiQuotaResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("consume_text_ai_quota");
  if (error) return { error: "quota_unavailable" };

  const quota = parseCustomerAiQuota(data);
  return quota ? { quota } : { error: "quota_unavailable" };
}
