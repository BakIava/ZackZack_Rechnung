import { getDocumentPreview } from "@/lib/repositories/documents";
import { pdfFileName } from "@/lib/pdf/pdf-filename";
import { getOrArchiveDocumentPdf } from "@/lib/pdf/pdf-storage";

// @react-pdf/renderer braucht Node-APIs (Streams/Buffer) → kein Edge-Runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ document_id: string }>;
}

/**
 * Liefert das PDF eines finalisierten Dokuments. Bevorzugt das im privaten
 * Supabase Storage abgelegte Langzeit-Archiv (10 Jahre, GoBD); existiert dort
 * noch keins, wird on-demand aus dem eingefrorenen Snapshot gerendert und dabei
 * archiviert (siehe lib/pdf/pdf-storage.ts).
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

  const pdf = await getOrArchiveDocumentPdf(preview);
  // Ein 0-Byte-PDF nie als Erfolg ausliefern — sonst hängt der Client ein
  // leeres File an (Teilen/E-Mail schlägt fehl). Lieber sauberer Fehler.
  if (pdf.length === 0) {
    return new Response("PDF render failed", { status: 500 });
  }
  const filename = pdfFileName(preview);

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      // Eigener, nicht-öffentlicher Beleg: nie in geteilten Caches ablegen.
      "Cache-Control": "private, no-store",
    },
  });
}
