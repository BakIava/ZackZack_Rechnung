"use server";

import { getCurrentCompanyId } from "@/lib/supabase/auth";
import { extractServiceLocation } from "@/lib/integrations/anthropic/service-location-extractor";
import { consumeCustomerAiQuota } from "@/lib/repositories/ai-usage";
import type { ServiceLocationIntakeResult } from "@/types/service-location";
import { processServiceLocationIntake } from "./service-location-intake-service";

export async function runServiceLocationIntake(text: unknown): Promise<ServiceLocationIntakeResult> {
  if (!(await getCurrentCompanyId())) return { status: "manual", reason: "not_authenticated" };
  return processServiceLocationIntake(text, {
    // Der bestehende Zähler begrenzt Kunden- und Einsatzort-Erkennung gemeinsam.
    consumeAiQuota: async () => {
      const result = await consumeCustomerAiQuota();
      if ("error" in result) throw new Error(result.error);
      return result.quota;
    },
    extractServiceLocation,
  });
}
