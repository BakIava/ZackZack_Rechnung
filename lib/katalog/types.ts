/**
 * Mehrsprachiger Leistungskatalog.
 * Der Handwerker wählt eine Position in seiner Sprache, aufs Dokument kommt
 * IMMER der deutsche Begriff. Dokument-Rendering liest nie das übersetzte Feld.
 */

import type { Locale } from "@/i18n/routing";

export interface KatalogEintrag {
  id: string;
  /** Deutscher Begriff – erscheint immer auf dem Dokument */
  de: string;
  /** Übersetzungen nur für die Bedien-UI */
  uebersetzungen: Record<Locale, string>;
  einheit: string;
  preisCents: number;
  kategorie: string;
  /** Anzahl der Dokumente, in denen diese Leistung verwendet wurde (Demo-Wert). */
  verwendungen: number;
}

/** UI-Anzeige in der Bediensprache (Fallback: deutscher Begriff). */
export function anzeigeName(eintrag: KatalogEintrag, locale: Locale): string {
  return eintrag.uebersetzungen[locale]?.trim() || eintrag.de;
}

/**
 * Name fürs Dokument – IMMER Deutsch, unabhängig von der Bediensprache.
 * Liest bewusst niemals `uebersetzungen`.
 */
export function dokumentName(eintrag: KatalogEintrag): string {
  return eintrag.de;
}
