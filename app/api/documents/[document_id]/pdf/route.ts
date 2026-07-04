import { getDocumentPreview } from "@/lib/documents/preview-queries";
import { loadPdfLogo } from "@/lib/pdf/document-logo";
import { pdfFileName } from "@/lib/pdf/pdf-filename";
import { renderDocumentPdf } from "@/lib/pdf/render-document";

// @react-pdf/renderer braucht Node-APIs (Streams/Buffer) → kein Edge-Runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ document_id: string }>;
}

/**
 * Liefert das PDF eines finalisierten Dokuments — on-demand aus dem
 * eingefrorenen Snapshot gerendert (reproduzierbar, kein gespeichertes Blob).
 *
 * Zugriffsschutz: getDocumentPreview prüft Anmeldung UND Firmenzugehörigkeit;
 * fremde/unbekannte Dokumente ergeben null → 404. Entwürfe haben kein PDF
 * (status != draft + document_number vorhanden Pflicht) → 404.
 */
export async function GET(_req: Request, { params }: RouteContext) {
  const { document_id } = await params;

  const preview = await getDocumentPreview(document_id);
  if (!preview) {
    return new Response("Not found", { status: 404 });
  }

  // Nur finalisierte Dokumente haben ein PDF — ein Entwurf nie.
  if (preview.status === "draft" || !preview.documentNumber) {
    return new Response("Document has no PDF (draft)", { status: 404 });
  }

  const logo = await loadPdfLogo(preview.company.logoUrl);
  const stream = await renderDocumentPdf(preview, logo);
  const filename = pdfFileName(preview);

  return new Response(stream as unknown as ReadableStream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      // Eigener, nicht-öffentlicher Beleg: nie in geteilten Caches ablegen.
      "Cache-Control": "private, no-store",
    },
  });
}
