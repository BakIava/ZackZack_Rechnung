import { createClient } from "@/lib/supabase/server";

export type ConsumeOnboardingAiQuotaResult =
  | { allowed: boolean }
  | { error: "quota_unavailable" };

function readAllowed(value: unknown): boolean | null {
  const row = Array.isArray(value) ? value[0] : value;
  if (typeof row !== "object" || row === null || !("allowed" in row)) {
    return null;
  }
  return typeof row.allowed === "boolean" ? row.allowed : null;
}

/** Reserviert atomar einen der zehn Setup-Extraktionsaufrufe pro UTC-Tag. */
export async function consumeOnboardingAiQuota(): Promise<ConsumeOnboardingAiQuotaResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("consume_onboarding_ai_quota");
  if (error) return { error: "quota_unavailable" };
  const allowed = readAllowed(data);
  return allowed === null ? { error: "quota_unavailable" } : { allowed };
}
