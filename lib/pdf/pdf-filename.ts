/**
 * Deterministischer, deutscher Dateiname für den PDF-Beleg. Gleiches Dokument →
 * gleicher Name. Umlaute/Sonderzeichen werden auf ASCII reduziert, damit der
 * Name in WhatsApp/E-Mail/Downloads überall sauber ankommt.
 */

import type { DocumentPreview } from "@/lib/documents/preview-types";

/** Nur die für den Dateinamen nötigen Felder — so auch aus der Liste nutzbar. */
type PdfFileNameInput = Pick<DocumentPreview, "docType" | "documentNumber">;

function slug(value: string): string {
  return value
    .replace(/[ä]/g, "ae")
    .replace(/[ö]/g, "oe")
    .replace(/[ü]/g, "ue")
    .replace(/[Ä]/g, "Ae")
    .replace(/[Ö]/g, "Oe")
    .replace(/[Ü]/g, "Ue")
    .replace(/[ß]/g, "ss")
    .replace(/[^a-zA-Z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function pdfFileName({ docType, documentNumber }: PdfFileNameInput): string {
  const wort = docType === "invoice" ? "Rechnung" : "Angebot";
  const nummer = documentNumber ? slug(documentNumber) : "Entwurf";
  return `${wort}_${nummer}.pdf`;
}
