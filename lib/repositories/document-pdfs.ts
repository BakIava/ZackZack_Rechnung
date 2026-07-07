/**
 * Repository für das PDF-Langzeit-Archiv (privater Storage-Bucket).
 *
 * Finalisierte Dokumente sind eingefroren (§14 UStG / GoBD): Das gerenderte
 * PDF wird beim Festschreiben abgelegt und dauerhaft (Rechnungen: 10 Jahre
 * Aufbewahrungspflicht, § 14b UStG) vorgehalten. Der Bucket ist nicht
 * öffentlich; ausschließlich der Service-Role-Client liest/schreibt. Die
 * Zugriffsberechtigung prüft der aufrufende Server-Pfad separat
 * (getDocumentPreview: Anmeldung + Firmenzugehörigkeit). Es gibt daher bewusst
 * keine anon/authenticated-Policies auf dem Bucket. Anlage:
 * scripts/document_pdf_storage.sql.
 */

import { createAdminClient } from "@/lib/supabase/admin";

export const PDF_BUCKET = "documents";

/** Objektpfad im Bucket. Dokument-IDs sind global eindeutige UUIDs. */
export function pdfObjectPath(documentId: string): string {
  return `${documentId}.pdf`;
}

/**
 * Legt das gerenderte PDF (idempotent, upsert) im Archiv ab.
 * Liefert die Fehlermeldung statt zu werfen – Archivierung ist best effort.
 */
export async function uploadDocumentPdf(
  documentId: string,
  body: Blob,
): Promise<{ errorMessage?: string }> {
  const admin = createAdminClient();
  const { error } = await admin.storage
    .from(PDF_BUCKET)
    .upload(pdfObjectPath(documentId), body, {
      contentType: "application/pdf",
      upsert: true,
    });
  if (error) return { errorMessage: error.message };
  return {};
}

/** Holt das archivierte PDF-Blob; null, wenn (noch) keines existiert. */
export async function downloadDocumentPdf(documentId: string): Promise<Blob | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(PDF_BUCKET)
    .download(pdfObjectPath(documentId));
  if (error || !data) return null;
  return data;
}
