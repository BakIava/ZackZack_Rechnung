"use server";

import { getCurrentUser } from "@/lib/supabase/auth";
import { reopenInvoiceRpc } from "@/lib/repositories/documents";
import { deleteDocumentPdf } from "@/lib/repositories/document-pdfs";

export type ReopenInvoiceError =
  | "notAuthenticated"
  | "invoiceNotReopenable"
  | "unknown";

export type ReopenInvoiceResult = { number: string } | { error: ReopenInvoiceError };

function mapError(message: string): ReopenInvoiceError {
  if (message.includes("not_authenticated")) return "notAuthenticated";
  if (message.includes("invoice_not_reopenable")) return "invoiceNotReopenable";
  return "unknown";
}

/**
 * „Rechnung korrigieren": macht eine festgeschriebene, unbezahlte Rechnung
 * wieder zum Entwurf. Die Nummer bleibt (SQL-Funktion reopen_invoice), beim
 * erneuten Festschreiben übernimmt finalize_document sie unverändert.
 *
 * Produktentscheidung: Die alte Fassung wird ersetzt. Deshalb wird das
 * archivierte PDF hier verworfen — sonst könnte die PDF-Route (Archiv-first)
 * nach dem erneuten Festschreiben noch die alte Fassung ausliefern, falls die
 * neue Archivierung fehlschlägt. Best effort: Das Festschreiben überschreibt
 * das Archiv ohnehin (upsert).
 */
export async function reopenInvoice(documentId: string): Promise<ReopenInvoiceResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "notAuthenticated" };

  const result = await reopenInvoiceRpc(documentId);
  if ("errorMessage" in result) {
    console.error("[reopenInvoice] rpc failed:", result.errorMessage);
    return { error: mapError(result.errorMessage) };
  }

  const { errorMessage } = await deleteDocumentPdf(documentId);
  if (errorMessage) {
    console.error("[reopenInvoice] pdf discard failed:", errorMessage);
  }

  return { number: result.number };
}
