import { renderToBuffer } from "@react-pdf/renderer";
import type { DocumentPreview } from "@/types/document";
import { createDocumentPdfElement } from "@/lib/pdf/document-pdf";
import type { PdfLogo } from "@/lib/pdf/pdf-logo";
import { registerPdfFonts } from "@/lib/pdf/fonts";

/**
 * Rendert den PDF-Beleg eines (finalisierten) Dokuments als Node-Buffer.
 * On-demand aus dem eingefrorenen DocumentPreview in dessen Vorlage
 * (`preview.template`) — deterministisch. Der Buffer eignet sich sowohl zum
 * direkten Ausliefern als auch zum Ablegen im Langzeit-Archiv (Supabase
 * Storage, vgl. lib/pdf/pdf-storage.ts). `logo` ist bereits als Bytes vorbereitet.
 *
 * Die Vorlage wird VOR dem Rendern aufgelöst: eine unbekannte oder nicht
 * implementierte Vorlage lehnt ab, bevor ein Buffer (und damit ein Archiv) entsteht.
 */
export async function renderDocumentPdfBuffer(
  preview: DocumentPreview,
  logo: PdfLogo | null,
): Promise<Buffer> {
  const element = createDocumentPdfElement(preview, logo);
  registerPdfFonts();
  return renderToBuffer(element);
}
