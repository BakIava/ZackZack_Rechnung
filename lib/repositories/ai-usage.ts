import { parseCustomerAiQuota } from "@/lib/customers/customer-ai-quota";
import { createClient } from "@/lib/supabase/server";
import type { CustomerAiQuota } from "@/types/customer-intake";

export type ConsumeCustomerAiQuotaResult =
  | { quota: CustomerAiQuota }
  | { error: "quota_unavailable" };

/** Reserviert atomar einen der zehn UTC-Tagesaufrufe des aktuellen Auth-Users. */
export async function consumeCustomerAiQuota(): Promise<ConsumeCustomerAiQuotaResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("consume_customer_ai_quota");
  if (error) return { error: "quota_unavailable" };

  const quota = parseCustomerAiQuota(data);
  return quota ? { quota } : { error: "quota_unavailable" };
}

