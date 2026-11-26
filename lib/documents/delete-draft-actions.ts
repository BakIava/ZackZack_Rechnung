"use server";

import { getCurrentUser } from "@/lib/supabase/auth";
import { deleteDraftDocumentRpc } from "@/lib/repositories/document-draft-deletion";

export type DeleteDraftError = "notAuthenticated" | "draftNotDeletable" | "unknown";

export type DeleteDraftResult = { ok: true } | { error: DeleteDraftError };

const UUID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

/** Sperren aus der Funktion selbst und aus dem Trigger protect_document_history. */
const NOT_DELETABLE = [
  "draft_not_deletable",
  "numbered_document_delete_forbidden",
  "linked_document_delete_forbidden",
  "finalized_document_immutable",
];

function mapError(message: string): DeleteDraftError {
  if (message.includes("draft_delete_not_authenticated")) return "notAuthenticated";
  if (NOT_DELETABLE.some((code) => message.includes(code))) return "draftNotDeletable";
  return "unknown";
}

/**
 * „Entwurf löschen": entfernt einen eigenen Entwurf ohne Nummer samt
 * Positionen. Festgeschriebene Belege, wieder geöffnete Rechnungen und
 * verknüpfte Entwürfe lehnt die Datenbank ab.
 */
export async function deleteDraft(documentId: string): Promise<DeleteDraftResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "notAuthenticated" };
  if (typeof documentId !== "string" || !UUID.test(documentId)) {
    return { error: "draftNotDeletable" };
  }

  const { errorMessage } = await deleteDraftDocumentRpc(documentId);
  if (errorMessage) {
    console.error("[deleteDraft] rpc failed:", errorMessage);
    return { error: mapError(errorMessage) };
  }

  // Bewusst kein revalidatePath: Im Flow würde das die gelöschte Seite neu
  // rendern. Der Aufrufer lädt die Liste neu bzw. navigiert zu ihr.
  return { ok: true };
}
