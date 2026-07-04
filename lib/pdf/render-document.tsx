import { renderToStream } from "@react-pdf/renderer";
import type { DocumentPreview } from "@/lib/documents/preview-types";
import { DocumentPdf, type PdfLogo } from "@/lib/pdf/document-pdf";
import { registerPdfFonts } from "@/lib/pdf/fonts";

/**
 * Rendert den PDF-Beleg eines (finalisierten) Dokuments als Node-Stream.
 * On-demand aus dem eingefrorenen DocumentPreview — deterministisch, kein
 * gespeichertes Blob nötig. `logo` ist bereits als Bytes vorbereitet.
 */
export async function renderDocumentPdf(
  preview: DocumentPreview,
  logo: PdfLogo | null,
) {
  registerPdfFonts();
  return renderToStream(<DocumentPdf preview={preview} logo={logo} />);
}
