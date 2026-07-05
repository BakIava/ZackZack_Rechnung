import { renderToBuffer } from "@react-pdf/renderer";
import type { DocumentPreview } from "@/lib/documents/preview-types";
import { DocumentPdf, type PdfLogo } from "@/lib/pdf/document-pdf";
import { registerPdfFonts } from "@/lib/pdf/fonts";

/**
 * Rendert den PDF-Beleg eines (finalisierten) Dokuments als Node-Buffer.
 * On-demand aus dem eingefrorenen DocumentPreview — deterministisch. Der Buffer
 * eignet sich sowohl zum direkten Ausliefern als auch zum Ablegen im
 * Langzeit-Archiv (Supabase Storage, vgl. lib/pdf/pdf-storage.ts).
 * `logo` ist bereits als Bytes vorbereitet.
 */
export async function renderDocumentPdfBuffer(
  preview: DocumentPreview,
  logo: PdfLogo | null,
): Promise<Buffer> {
  registerPdfFonts();
  return renderToBuffer(<DocumentPdf preview={preview} logo={logo} />);
}
