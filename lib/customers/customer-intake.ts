import type { CustomerIntakeData } from "@/types/customer-intake";

export const CUSTOMER_INTAKE_MAX_LENGTH = 500;

export const EMPTY_CUSTOMER_INTAKE: CustomerIntakeData = {
  customer_type: null,
  firstname: null,
  lastname: null,
  company_name: null,
  street: null,
  street_no: null,
  postcode: null,
  city: null,
  phone: null,
  email: null,
};

const STRING_FIELDS = [
  "firstname",
  "lastname",
  "company_name",
  "street",
  "street_no",
  "postcode",
  "city",
  "phone",
  "email",
] as const;

function nullableTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Validiert jedes Claude-Feld unabhängig. Ein fehlerhaftes Feld verwirft nicht
 * die übrigen sicheren Daten; zusätzliche Felder werden bewusst ignoriert.
 */
export function parseCustomerExtraction(value: unknown): CustomerIntakeData | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const record = value as Record<string, unknown>;
  const customerType = record.customer_type;
  const result: CustomerIntakeData = {
    ...EMPTY_CUSTOMER_INTAKE,
    customer_type:
      customerType === "private" || customerType === "business"
        ? customerType
        : null,
  };

  for (const field of STRING_FIELDS) {
    result[field] = nullableTrimmedString(record[field]);
  }
  return result;
}

export function parseCustomerExtractionJson(json: string): CustomerIntakeData | null {
  try {
    return parseCustomerExtraction(JSON.parse(json));
  } catch {
    return null;
  }
}

export function hasExtractedCustomerData(customer: CustomerIntakeData): boolean {
  return Object.values(customer).some((value) => value !== null);
}

export function hasStructuredAddress(customer: CustomerIntakeData): boolean {
  return Boolean(customer.street && (customer.postcode || customer.city));
}

export function validateCustomerIntakeText(text: unknown): string | null {
  if (typeof text !== "string") return null;
  const trimmed = text.trim();
  if (trimmed.length === 0 || trimmed.length > CUSTOMER_INTAKE_MAX_LENGTH) {
    return null;
  }
  return trimmed;
}
