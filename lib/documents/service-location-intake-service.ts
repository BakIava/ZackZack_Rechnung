import type { CustomerAiQuota } from "@/types/customer-intake";
import type { ServiceLocationExtraction, ServiceLocationIntakeResult } from "@/types/service-location";
import { hasUsableServiceLocation, validateServiceLocationText } from "./service-location-intake";

interface ServiceLocationIntakeDependencies {
  consumeAiQuota: () => Promise<CustomerAiQuota>;
  extractServiceLocation: (text: string) => Promise<ServiceLocationExtraction>;
}

export async function processServiceLocationIntake(
  input: unknown,
  dependencies: ServiceLocationIntakeDependencies,
): Promise<ServiceLocationIntakeResult> {
  const text = validateServiceLocationText(input);
  if (!text) return { status: "manual", reason: "invalid_input" };

  let quota: CustomerAiQuota;
  try {
    quota = await dependencies.consumeAiQuota();
  } catch {
    return { status: "manual", reason: "quota_unavailable" };
  }
  if (!quota.allowed) {
    return { status: "manual", reason: "daily_limit_reached", dailyLimit: quota.dailyLimit };
  }

  let location: ServiceLocationExtraction;
  try {
    location = await dependencies.extractServiceLocation(text);
  } catch {
    return { status: "manual", reason: "extraction_failed" };
  }
  if (!hasUsableServiceLocation(location)) return { status: "manual", reason: "no_usable_data" };
  return { status: "extracted", location };
}
