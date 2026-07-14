import type { PreviewCustomer } from "@/types/customer";
import type { CustomerDbRow, CustomerType } from "@/types/database";

type CustomerProps = Pick<
  CustomerDbRow,
  "customer_type" | "firstname" | "lastname" | "company_name"
>;

export function getCustomerName(customer: CustomerProps | null): string {
  if (customer === null) return "";

  let name = "";
  if (customer.customer_type === "business") {
    name += customer.company_name ?? "";
  }

  if (customer.customer_type === "private") {
    name += [customer.firstname, customer.lastname].filter(Boolean).join(" ");
  }

  return name.trim();
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

/** Wandelt einen unbekannten JSONB-Snapshot defensiv in das Vorschau-Modell um. */
export function toPreviewCustomer(snapshot: unknown): PreviewCustomer | null {
  if (!snapshot || typeof snapshot !== "object") return null;

  const value = snapshot as Record<string, unknown>;
  const customerType = value.customer_type;
  if (customerType !== "private" && customerType !== "business") return null;

  const customer = {
    customer_type: customerType as CustomerType,
    company_name: nullableString(value.company_name),
    firstname: nullableString(value.firstname),
    lastname: nullableString(value.lastname),
  };
  if (!getCustomerName(customer)) return null;

  return {
    ...customer,
    street: nullableString(value.street),
    streetNo: nullableString(value.street_no),
    postcode: nullableString(value.postcode),
    city: nullableString(value.city),
    email: nullableString(value.email),
    phone: nullableString(value.phone),
  };
}
