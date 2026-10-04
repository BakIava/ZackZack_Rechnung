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

/**
 * Wortmarke aus den Anfangsbuchstaben aller Namenswörter („Technik Hilfe
 * Sander“ → „THS“), höchstens `maxLetters`; Wörter ohne Buchstaben am Anfang
 * („&“, „-“) zählen nicht. Ein einzelnes Wort ergibt die ersten zwei Zeichen.
 */
export function deriveCompanyInitials(companyName: string, maxLetters = 4): string {
  const words = companyName.trim().split(/\s+/).filter((word) => /^\p{L}/u.test(word));
  if (words.length === 0) return "—";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return words
    .slice(0, maxLetters)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

/** Firmenlogo-Fallback; bewusst unabhängig von Empfänger-/Kundendaten. */
export function deriveCompanyMonogram(companyName: string): string {
  return companyName.trim() ? deriveInitialsFromName(companyName) : "—";
}
