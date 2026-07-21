/**
 * Repository für den atomaren Onboarding-Abschluss. Firma, Benutzerprofil,
 * Gewerke und Starterkatalog werden ausschließlich in der SQL-Funktion angelegt.
 */

import { createClient } from "@/lib/supabase/server";
import type { SetupFormData } from "@/types/company";

export type CompleteOnboardingRepositoryResult =
  | { ok: true; companyId: string }
  | {
      ok: false;
      reason:
        | "already_completed"
        | "not_authenticated"
        | "tax_id_required"
        | "trades_required"
        | "trades_invalid"
        | "database_error";
    };

function mapOnboardingDatabaseError(message: string): CompleteOnboardingRepositoryResult {
  if (message.includes("onboarding_already_completed")) {
    return { ok: false, reason: "already_completed" };
  }
  if (message.includes("onboarding_not_authenticated")) {
    return { ok: false, reason: "not_authenticated" };
  }
  if (message.includes("onboarding_tax_id_required")) {
    return { ok: false, reason: "tax_id_required" };
  }
  if (message.includes("onboarding_trades_required")) {
    return { ok: false, reason: "trades_required" };
  }
  if (message.includes("onboarding_trades_invalid")) {
    return { ok: false, reason: "trades_invalid" };
  }
  return { ok: false, reason: "database_error" };
}

export async function completeOnboardingRpc(
  companyData: SetupFormData,
): Promise<CompleteOnboardingRepositoryResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("complete_onboarding", {
    company_data: companyData,
  });

  if (error) return mapOnboardingDatabaseError(error.message);
  if (typeof data !== "string" || data.length === 0) {
    return { ok: false, reason: "database_error" };
  }
  return { ok: true, companyId: data };
}
