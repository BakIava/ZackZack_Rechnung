import type { CustomerType } from "@/types/database";

/** Leitet Initialen aus einem Namen ab: bei mehreren Wörtern Vor- und
 *  Nachname-Initiale, sonst die ersten zwei Zeichen — immer in Großbuchstaben.
 *  (Gemeinsame Quelle für Kunden-Avatare; identisch zu den bisherigen lokalen
 *  Implementierungen in customer-detail und NewCustomerModal.) */

interface DeriveInitialsProps {
  customer_type?: CustomerType;
  customerType?: CustomerType;
  company_name?: string | null;
  firstname?: string | null;
  lastname?: string | null;
}

export function deriveInitials(props: DeriveInitialsProps | null): string {
  if (props === null) return "—";

  const customerType = props.customer_type ?? props.customerType;
  if (customerType === "business") {
    return props.company_name ? deriveInitialsFromName(props.company_name) : "—";
  }

  const name = [props.firstname?.trim(), props.lastname?.trim()]
    .filter(Boolean)
    .join(" ");
  return name ? deriveInitialsFromName(name) : "—";
}

export function deriveInitialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length > 1)
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

/** Firmenlogo-Fallback; bewusst unabhängig von Empfänger-/Kundendaten. */
export function deriveCompanyMonogram(companyName: string): string {
  return companyName.trim() ? deriveInitialsFromName(companyName) : "—";
}
