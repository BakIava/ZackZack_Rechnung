/**
 * Zentrale Auflösung: welche Vorlage rendert einen Beleg? Eine einzige, reine
 * Regel für Vorschau, PDF-Route, Archivierung und Finalisierung — angewendet im
 * Preview-Repository (lib/repositories/document-previews.ts), damit alle Pfade
 * dieselbe Auswahl erhalten. Kein anderer Code entscheidet über Vorlagen.
 *
 *  - Entwurf: immer die aktuelle Firmenwahl (companies.document_template_id) in
 *    ihrer neuesten Version. Eine Änderung der Firmenwahl wirkt sofort auf
 *    offene Entwürfe — bewusst, wie beim Logo.
 *  - Finalisiert: exakt der beim Festschreiben eingefrorene Snapshot
 *    (documents.template_id/template_version), unabhängig von späteren
 *    Firmenänderungen.
 *  - Finalisiert ohne Snapshot (Altbelege vor der Migration):
 *    LEGACY_DOCUMENT_TEMPLATE (`standard@1`).
 *
 * Werte kommen roh aus der DB und werden nur im jeweils relevanten Zweig
 * geprüft: Ein finalisierter Beleg hängt nie von der Firmenwahl ab — ein
 * kaputter Firmenwert blockiert also kein Archiv-PDF, nur Entwürfe. Ungültige
 * Werte werfen DocumentTemplateError; es gibt keinen stillen Fallback.
 */

import type { DocStatus, DocumentTemplateRef } from "@/types/document";
import {
  DEFAULT_DOCUMENT_TEMPLATE,
  DocumentTemplateError,
  LEGACY_DOCUMENT_TEMPLATE,
  latestDocumentTemplate,
  parseStoredTemplateId,
  parseStoredTemplateVersion,
} from "./template-catalog";

export interface DocumentTemplateSelectionInput {
  status: DocStatus;
  /** documents.template_id — Snapshot, nur bei finalisierten Belegen maßgeblich. */
  documentTemplateId: unknown;
  /** documents.template_version — Snapshot, nur bei finalisierten Belegen maßgeblich. */
  documentTemplateVersion: unknown;
  /** companies.document_template_id — Wahl der Firma für Entwürfe. */
  companyTemplateId: unknown;
}

export function selectDocumentTemplate(
  input: DocumentTemplateSelectionInput,
): DocumentTemplateRef {
  if (input.status !== "draft") {
    const id = parseStoredTemplateId(input.documentTemplateId);
    const version = parseStoredTemplateVersion(input.documentTemplateVersion);
    if (id === null && version === null) return LEGACY_DOCUMENT_TEMPLATE;
    if (id === null || version === null) {
      throw new DocumentTemplateError("incomplete_template_snapshot", `${id}@${version}`);
    }
    return { id, version };
  }

  return latestDocumentTemplate(
    parseStoredTemplateId(input.companyTemplateId) ?? DEFAULT_DOCUMENT_TEMPLATE.id,
  );
}
