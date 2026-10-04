"use server";

import { getCurrentUser } from "@/lib/supabase/auth";
import { finalizeDocumentRpc } from "@/lib/repositories/documents";
import {
  getDocumentPreview,
  getDocumentPreviewFresh,
} from "@/lib/repositories/document-previews";
import { archiveDocumentPdf } from "@/lib/pdf/pdf-storage";
import { assertRenderableTemplate } from "@/lib/pdf/templates/template-catalog";
import { canFinalizePreview } from "./finalize-validation";

export type FinalizeError =
  | "notAuthenticated"
  | "notFinalizable"
  | "issueDateMissing"
  | "validUntilMissing"
  | "validUntilInvalid"
  | "expiredConfirmationRequired"
  | "unknown";

export type FinalizeResult = { number: string } | { error: FinalizeError };

/**
 * Bildet die von finalize_document geworfenen Postgres-Fehlermeldungen auf
 * stabile, übersetzbare Fehlercodes ab (die Meldung ist die RAISE-EXCEPTION-
 * Nachricht der SQL-Funktion).
 */
function mapError(message: string): FinalizeError {
  if (message.includes("not_authenticated")) return "notAuthenticated";
  if (message.includes("document_not_finalizable")) return "notFinalizable";
  if (message.includes("issue_date_missing")) return "issueDateMissing";
  if (message.includes("positions_missing")) return "notFinalizable";
  if (message.includes("customer_name_missing")) return "notFinalizable";
  if (message.includes("customer_address_missing")) return "notFinalizable";
  if (message.includes("valid_until_missing")) return "validUntilMissing";
  if (message.includes("valid_until_before_issue_date")) return "validUntilInvalid";
  if (message.includes("expired_quote_confirmation_required")) {
    return "expiredConfirmationRequired";
  }
  // template_mismatch (Firmenwahl hat sich seit der Vorschau geändert),
  // template_snapshot_incomplete, template_version_invalid: erneut versuchen.
  return "unknown";
}

/**
 * Finalisiert einen Entwurf: Nummernvergabe + Statuswechsel laufen atomar in
 * der SQL-Funktion finalize_document (SECURITY DEFINER). Die Nummer wird NIE im
 * Client erzeugt. Doppel-Finalisierung / fremde Dokumente schlagen dort sauber
 * fehl und landen hier als Fehlercode.
 */
export async function finalizeDocument(
  documentId: string,
  confirmExpiredQuote = false,
): Promise<FinalizeResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "notAuthenticated" };

  // Die Vorschau des Entwurfs liefert auch die Vorlage, mit der er zuletzt
  // gerendert wurde (aktuelle Firmenwahl, neueste Version). Genau diese wird
  // beim Festschreiben eingefroren. Ungültige Vorlagenwerte werfen beim Laden
  // bzw. Prüfen — dann wird nichts finalisiert und nichts archiviert.
  let draftPreview: Awaited<ReturnType<typeof getDocumentPreview>>;
  try {
    draftPreview = await getDocumentPreview(documentId);
    if (draftPreview) assertRenderableTemplate(draftPreview.template);
  } catch (err) {
    console.error("[finalizeDocument] template invalid:", err instanceof Error ? err.message : err);
    return { error: "notFinalizable" };
  }
  if (!draftPreview || draftPreview.status !== "draft" || !canFinalizePreview(draftPreview)) {
    return { error: "notFinalizable" };
  }

  const result = await finalizeDocumentRpc(documentId, confirmExpiredQuote, draftPreview.template);
  if ("errorMessage" in result) {
    console.error("[finalizeDocument] rpc failed:", result.errorMessage);
    return { error: mapError(result.errorMessage) };
  }

  // Beleg jetzt ins Langzeit-Archiv legen — der Moment des Festschreibens ist
  // der rechtlich relevante (Dokument ist ab hier eingefroren). Best effort:
  // schlägt die Archivierung fehl (z. B. Storage kurz nicht erreichbar), bleibt
  // die Finalisierung gültig; die PDF-Route archiviert beim ersten Abruf nach.
  try {
    const preview = await getDocumentPreviewFresh(documentId);
    if (preview && preview.status !== "draft") {
      await archiveDocumentPdf(preview);
    }
  } catch (err) {
    console.error("[finalizeDocument] pdf archive failed:", err);
  }

  return { number: result.number };
}
