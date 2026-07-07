/**
 * Begleittext beim Teilen des Belegs. Geht an den (deutschen) Kunden und ist
 * daher IMMER Deutsch — unabhängig von der Bediensprache, genau wie der Beleg
 * selbst. Rein & deterministisch, damit testbar.
 */

import type { DocType } from "@/types/document";


/** Betreff für E-Mail / Titel im Teilen-Sheet, z. B. „Rechnung R-2026-041". */
export function shareSubject(docType: DocType, documentNumber: string): string {
  const wort = docType === "invoice" ? "Rechnung" : "Angebot";
  return `${wort} ${documentNumber}`.trim();
}

/** Kurzer, höflicher Begleittext. Firmenname als Grußzeile, falls vorhanden. */
export function shareMessage(
  docType: DocType,
  documentNumber: string,
  companyName: string | null,
): string {
  const wort = docType === "invoice" ? "Ihre Rechnung" : "Ihr Angebot";
  const beleg = documentNumber ? `${wort} ${documentNumber}` : wort;
  const firma = companyName?.trim();
  const gruss = firma ? `\n\nMit freundlichen Grüßen\n${firma}` : "";
  return `Guten Tag,\n\nanbei ${beleg}.${gruss}`;
}
