import type { CustomerAiQuota } from "@/types/customer-intake";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** Validiert die ungeformte TABLE-Rückgabe der Supabase-RPC defensiv. */
export function parseCustomerAiQuota(value: unknown): CustomerAiQuota | null {
  const rawRow = Array.isArray(value) ? value[0] : value;
  const row = asRecord(rawRow);
  if (!row) return null;

  const { allowed, remaining, daily_limit: dailyLimit } = row;
  if (
    typeof allowed !== "boolean" ||
    typeof remaining !== "number" ||
    !Number.isInteger(remaining) ||
    typeof dailyLimit !== "number" ||
    !Number.isInteger(dailyLimit) ||
    dailyLimit <= 0 ||
    remaining < 0 ||
    remaining > dailyLimit
  ) {
    return null;
  }

  return { allowed, remaining, dailyLimit };
}

