import { createAdminClient } from "@/lib/supabase/admin";
import { loadPdfLogo } from "@/lib/pdf/document-logo";
import { renderDocumentPdfBuffer } from "@/lib/pdf/render-document";
import type { DocumentPreview } from "@/types/document";

/**
 * Langzeit-Archiv für finalisierte Belege.
 *
 * Finalisierte Dokumente sind eingefroren (§14 UStG / GoBD): Nummer, Empfänger-
 * Snapshot und Positionen ändern sich nie mehr. Das gerenderte PDF wird deshalb
 * beim Festschreiben in einen PRIVATEN Supabase-Storage-Bucket abgelegt und dort
 * dauerhaft (Rechnungen: 10 Jahre Aufbewahrungspflicht, § 14b UStG) vorgehalten.
 *
 * Der Bucket ist nicht öffentlich; ausschließlich der Service-Role-Client (hier)
 * liest/schreibt. Die Zugriffsberechtigung prüft die aufrufende Route separat
 * (getDocumentPreview: Anmeldung + Firmenzugehörigkeit). Es gibt daher bewusst
 * keine anon/authenticated-Policies auf dem Bucket — alles läuft über den
 * autorisierten Server-Pfad. Bucket-Anlage: scripts/document_pdf_storage.sql.
 */
export const PDF_BUCKET = "documents";

/** Objektpfad im Bucket. Dokument-IDs sind global eindeutige UUIDs. */
export function pdfObjectPath(documentId: string): string {
  return `${documentId}.pdf`;
}

/**
 * Rendert den Beleg und legt ihn (idempotent, upsert) im Archiv ab. Gibt den
 * gerenderten Buffer zurück, damit der Aufrufer ihn direkt ausliefern kann.
 * Ein fehlgeschlagener Upload wird geloggt, aber nicht geworfen: das PDF bleibt
 * ausgelieferbar, und der nächste Abruf archiviert erneut (self-healing).
 */
export async function archiveDocumentPdf(preview: DocumentPreview): Promise<Buffer> {
  const logo = await loadPdfLogo(preview.company.logoUrl);
  const buffer = await renderDocumentPdfBuffer(preview, logo);

  const admin = createAdminClient();
  // Als Blob hochladen (nicht als roher Node-Buffer): der Buffer-Body kann in
  // manchen Node-/Fetch-Umgebungen zu einem 0-Byte-Objekt führen. Der Blob
  // trägt Länge + Content-Type zuverlässig.
  const body = new Blob([new Uint8Array(buffer)], { type: "application/pdf" });
  const { error } = await admin.storage
    .from(PDF_BUCKET)
    .upload(pdfObjectPath(preview.id), body, {
      contentType: "application/pdf",
      upsert: true,
    });
  if (error) {
    console.error("[archiveDocumentPdf] upload failed:", error.message);
  }
  return buffer;
}

/**
 * Holt das archivierte PDF aus dem Storage; null, wenn (noch) keines existiert.
 * Ein leeres/kaputtes Objekt (0 Bytes) gilt bewusst als "nicht vorhanden", damit
 * der Aufrufer neu rendert statt ein leeres PDF auszuliefern.
 */
export async function fetchArchivedPdf(documentId: string): Promise<Buffer | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(PDF_BUCKET)
    .download(pdfObjectPath(documentId));
  if (error || !data) return null;
  const buffer = Buffer.from(await data.arrayBuffer());
  return buffer.length > 0 ? buffer : null;
}

/**
 * Liefert das PDF eines finalisierten Belegs: bevorzugt das eingefrorene
 * Archiv-Blob (GoBD — exakt die Bytes, die der Kunde erhalten hat), sonst
 * on-demand gerendert und dabei nachträglich archiviert (self-healing für
 * Belege, die vor Einführung des Archivs finalisiert wurden, oder für ein
 * fehlerhaft leer gespeichertes Objekt — upsert überschreibt es). Nur für
 * finalisierte Dokumente aufrufen — Entwürfe haben kein PDF.
 */
export async function getOrArchiveDocumentPdf(preview: DocumentPreview): Promise<Buffer> {
  const archived = await fetchArchivedPdf(preview.id);
  if (archived) return archived;
  return archiveDocumentPdf(preview);
}
