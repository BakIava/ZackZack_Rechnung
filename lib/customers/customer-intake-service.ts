import {
  EMPTY_CUSTOMER_INTAKE,
  hasExtractedCustomerData,
  hasStructuredAddress,
  validateCustomerIntakeText,
} from "./customer-intake";
import type {
  CustomerAddressCandidate,
  CustomerAiQuota,
  CustomerIntakeData,
  CustomerIntakeManualReason,
  CustomerIntakeResult,
} from "@/types/customer-intake";

interface CustomerIntakeDependencies {
  consumeCustomerAiQuota: () => Promise<CustomerAiQuota>;
  extractCustomerData: (text: string) => Promise<CustomerIntakeData>;
  geocodeCustomerAddress: (
    customer: CustomerIntakeData,
  ) => Promise<CustomerAddressCandidate[]>;
}

function manual(
  reason: Exclude<CustomerIntakeManualReason, "daily_limit_reached">,
  customer: CustomerIntakeData = { ...EMPTY_CUSTOMER_INTAKE },
): CustomerIntakeResult {
  return { status: "manual", reason, customer };
}

/** Providerunabhängige Ablaufsteuerung für die vereinfachte Kundeneingabe. */
export async function processCustomerIntake(
  text: unknown,
  dependencies: CustomerIntakeDependencies,
): Promise<CustomerIntakeResult> {
  const validatedText = validateCustomerIntakeText(text);
  if (!validatedText) return manual("invalid_input");

  let quota: CustomerAiQuota;
  try {
    quota = await dependencies.consumeCustomerAiQuota();
  } catch {
    return manual("quota_unavailable");
  }
  if (!quota.allowed) {
    return {
      status: "manual",
      reason: "daily_limit_reached",
      customer: { ...EMPTY_CUSTOMER_INTAKE },
      dailyLimit: quota.dailyLimit,
    };
  }

  let customer: CustomerIntakeData;
  try {
    customer = await dependencies.extractCustomerData(validatedText);
  } catch {
    return manual("extraction_failed");
  }

  if (!hasExtractedCustomerData(customer)) {
    return manual("no_extracted_data", customer);
  }
  if (!hasStructuredAddress(customer)) {
    return manual("insufficient_address", customer);
  }

  let addresses: CustomerAddressCandidate[];
  try {
    addresses = await dependencies.geocodeCustomerAddress(customer);
  } catch {
    return manual("geocoding_failed", customer);
  }

  if (addresses.length === 0) return manual("no_matches", customer);
  return {
    status: "address_matches",
    customer,
    addresses: addresses.slice(0, 3),
  };
}
