import type { DocStatus, DocumentRelationInfo } from "@/types/document";

interface DeletableDraftInput {
  id: string;
  status: DocStatus;
  documentNumber: string | null;
}

/**
 * Darf der Nutzer diesen Beleg löschen? Nur Entwürfe ohne Nummer, die nicht
 * Ziel einer Verknüpfung sind. Wieder geöffnete Rechnungen tragen ihre Nummer
 * (sonst Lücke im Nummernkreis); umgewandelte und angepasste Entwürfe hängen
 * an ihrem Angebot. Dieselbe Regel erzwingt `delete_draft_document` (SQL).
 */
export function isDeletableDraft(
  doc: DeletableDraftInput,
  relations: Pick<DocumentRelationInfo, "targetDocumentId">[],
): boolean {
  if (doc.status !== "draft") return false;
  if (doc.documentNumber !== null && doc.documentNumber !== "") return false;
  return !relations.some((relation) => relation.targetDocumentId === doc.id);
}
