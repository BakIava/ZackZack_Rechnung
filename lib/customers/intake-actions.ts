"use server";

import { getCurrentCompanyId } from "@/lib/supabase/auth";
import { processCustomerIntake } from "./customer-intake-service";
import {
  CustomerExtractionError,
  extractCustomerData,
} from "@/lib/integrations/anthropic/customer-extractor";
import {
  AddressGeocodingError,
  geocodeCustomerAddress,
} from "@/lib/integrations/mapbox/address-geocoder";
import { consumeCustomerAiQuota } from "@/lib/repositories/ai-usage";
import { EMPTY_CUSTOMER_INTAKE } from "./customer-intake";
import type { CustomerIntakeResult } from "@/types/customer-intake";

function safeErrorCode(error: unknown): string {
  if (
    error instanceof CustomerExtractionError ||
    error instanceof AddressGeocodingError
  ) {
    return error.code;
  }
  return "unknown";
}

export async function runCustomerIntake(
  text: unknown,
): Promise<CustomerIntakeResult> {
  const companyId = await getCurrentCompanyId();
  if (!companyId) {
    return {
      status: "manual",
      reason: "not_authenticated",
      customer: { ...EMPTY_CUSTOMER_INTAKE },
    };
  }

  return processCustomerIntake(text, {
    consumeCustomerAiQuota: async () => {
      const result = await consumeCustomerAiQuota();
      if ("error" in result) {
        console.error("[customer-intake] AI quota check failed", {
          code: result.error,
        });
        throw new Error(result.error);
      }
      return result.quota;
    },
    extractCustomerData: async (input) => {
      try {
        return await extractCustomerData(input);
      } catch (error) {
        console.error("[customer-intake] Claude extraction failed", {
          code: safeErrorCode(error),
        });
        throw error;
      }
    },
    geocodeCustomerAddress: async (customer) => {
      try {
        return await geocodeCustomerAddress(customer);
      } catch (error) {
        console.error("[customer-intake] Mapbox geocoding failed", {
          code: safeErrorCode(error),
        });
        throw error;
      }
    },
  });
}
