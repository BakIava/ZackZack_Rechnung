import { CustomerDbRow } from "@/types/database";

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
