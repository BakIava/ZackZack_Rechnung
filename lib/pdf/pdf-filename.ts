/**
 * Deterministischer, deutscher Dateiname für den PDF-Beleg. Gleiches Dokument →
 * gleicher Name. Umlaute/Sonderzeichen werden auf ASCII reduziert, damit der
 * Name in WhatsApp/E-Mail/Downloads überall sauber ankommt.
 */

import type { DocumentPreview } from "@/lib/documents/preview-types";

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

export function pdfFileName(preview: DocumentPreview): string {
  const wort = preview.docType === "rechnung" ? "Rechnung" : "Angebot";
  const nummer = preview.documentNumber ? slug(preview.documentNumber) : "Entwurf";
  return `${wort}_${nummer}.pdf`;
}
