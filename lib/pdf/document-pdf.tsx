/**
 * Kanonischer PDF-Beleg (@react-pdf/renderer) für Browser-Vorschau und
 * serverseitigen Final-PDF-Pfad. IMMER Deutsch/LTR, reine Kundensicht.
 *
 * Ablauf (für beide Pfade identisch):
 *   DocumentPreview ──buildDocumentRenderData──▶ DocumentRenderData
 *   preview.template ──renderDocumentTemplate──▶ Layout der Vorlagenversion
 *
 * Harte Regeln (in render-data + Typen abgesichert):
 *  - Kein Einkaufspreis / keine Marge — nur Verkaufspreis pro Zeile.
 *  - §19-Kleinunternehmer: keine USt., automatischer §19-Hinweis.
 *  - Empfänger aus dem Snapshot; Dokumentsprache unabhängig von der Bedienung.
 *
 * Reproduzierbar: bei gleichem (finalisiertem, eingefrorenem) Dokument und
 * gleicher Vorlagenversion rendert dieselbe Eingabe denselben Beleg.
 */

import type { ReactElement } from "react";
import type { DocumentProps } from "@react-pdf/renderer";
import type { DocumentPreview } from "@/types/document";
import type { PdfLogo } from "@/lib/pdf/pdf-logo";
import { buildDocumentRenderData } from "@/lib/pdf/render-data";
import { renderDocumentTemplate } from "@/lib/pdf/templates/template-registry";

interface DocumentPdfProps {
  preview: DocumentPreview;
  logo: PdfLogo | null;
}

/** React-PDF-Dokument in der Vorlage `preview.template`; wirft bei unbekannter Vorlage. */
export function createDocumentPdfElement(
  preview: DocumentPreview,
  logo: PdfLogo | null,
): ReactElement<DocumentProps> {
  return renderDocumentTemplate({
    template: preview.template,
    data: buildDocumentRenderData(preview, logo),
  });
}

/** Vollständiger A4-Beleg. `logo` ist serverseitig vorbereitet (siehe document-logo.ts). */
export function DocumentPdf({ preview, logo }: DocumentPdfProps) {
  return createDocumentPdfElement(preview, logo);
}
