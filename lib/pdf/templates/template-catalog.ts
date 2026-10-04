/**
 * Katalog der Belegvorlagen und ihrer veröffentlichten Layoutversionen — rein,
 * ohne React-PDF, damit Repositories und Server-Actions ihn importieren können.
 * Die Zuordnung Version → Layout liegt in template-registry.tsx.
 *
 * Versionierung (append-only):
 *  - Eine veröffentlichte Version wird nie optisch verändert; jede sichtbare
 *    Layoutänderung ist eine neue Version derselben Vorlage.
 *  - Alte Versionen bleiben im Code, solange ein Beleg sie referenzieren kann,
 *    damit ein fehlendes Archiv-PDF in derselben Optik nachgerendert wird.
 *  - Archivierte PDFs bleiben unabhängig davon der maßgebliche Beleg.
 */

import {
  DOCUMENT_TEMPLATE_IDS,
  type DocumentTemplateId,
  type DocumentTemplateRef,
} from "@/types/document";

/** Veröffentlichte Versionen je Vorlage, aufsteigend. Leer = reserviert, nicht renderbar. */
export const DOCUMENT_TEMPLATE_VERSIONS: Readonly<
  Record<DocumentTemplateId, readonly number[]>
> = {
  standard: [1],
  "ths-classic": [1],
  "erhan-excel": [1],
};

/** Vorlage für neue Belege, solange Firma und Dokument nichts anderes festlegen. */
export const DEFAULT_DOCUMENT_TEMPLATE: DocumentTemplateRef = { id: "standard", version: 1 };

/**
 * Finalisierte Belege ohne Vorlagen-Snapshot (alle Belege vor Einführung der
 * Vorlagen) werden — falls ihr Archiv fehlt — mit genau dieser Version gerendert.
 */
export const LEGACY_DOCUMENT_TEMPLATE: DocumentTemplateRef = { id: "standard", version: 1 };

export type DocumentTemplateErrorCode =
  | "unknown_template"
  | "template_not_implemented"
  | "unknown_template_version"
  | "incomplete_template_snapshot";

/** Bewusst kein stiller Fallback: ein Beleg wird nie in einer anderen Vorlage gerendert. */
export class DocumentTemplateError extends Error {
  readonly code: DocumentTemplateErrorCode;

  constructor(code: DocumentTemplateErrorCode, template: string) {
    super(`${code}: ${template}`);
    this.name = "DocumentTemplateError";
    this.code = code;
  }
}

export function isDocumentTemplateId(value: unknown): value is DocumentTemplateId {
  return (DOCUMENT_TEMPLATE_IDS as readonly unknown[]).includes(value);
}

/** Gespeicherte Vorlagen-ID (DB): null bleibt null, Unbekanntes wirft — nie stiller Fallback. */
export function parseStoredTemplateId(value: unknown): DocumentTemplateId | null {
  if (value === null || value === undefined) return null;
  if (isDocumentTemplateId(value)) return value;
  throw new DocumentTemplateError("unknown_template", String(value));
}

/** Gespeicherte Layoutversion (DB): null bleibt null, alles außer einer Ganzzahl ≥ 1 wirft. */
export function parseStoredTemplateVersion(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && Number.isInteger(value) && value >= 1) return value;
  throw new DocumentTemplateError("unknown_template_version", String(value));
}

/** Neueste renderbare Version einer Vorlage; wirft für reservierte Vorlagen. */
export function latestDocumentTemplate(id: DocumentTemplateId): DocumentTemplateRef {
  const version = DOCUMENT_TEMPLATE_VERSIONS[id].at(-1);
  if (version === undefined) throw new DocumentTemplateError("template_not_implemented", id);
  return { id, version };
}

/**
 * Prüft eine Vorlagenreferenz aus beliebiger Quelle (DB, Request, Client).
 * Wirft DocumentTemplateError für unbekannte IDs, reservierte Vorlagen und
 * unbekannte Versionen.
 */
export function assertRenderableTemplate(ref: {
  id: string;
  version: number;
}): DocumentTemplateRef {
  const label = `${ref.id}@${ref.version}`;
  if (!isDocumentTemplateId(ref.id)) throw new DocumentTemplateError("unknown_template", label);
  const versions = DOCUMENT_TEMPLATE_VERSIONS[ref.id];
  if (versions.length === 0) {
    throw new DocumentTemplateError("template_not_implemented", label);
  }
  if (!versions.includes(ref.version)) {
    throw new DocumentTemplateError("unknown_template_version", label);
  }
  return { id: ref.id, version: ref.version };
}
