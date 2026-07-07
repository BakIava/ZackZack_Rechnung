/**
 * Mehrsprachiger Leistungskatalog: Anzeige- vs. Dokumentname.
 * Der Handwerker wählt eine Position in seiner Sprache, aufs Dokument kommt
 * IMMER der deutsche Begriff. Dokument-Rendering liest nie das übersetzte Feld.
 */

import type { Locale } from "@/i18n/routing";
import type { KatalogEintrag } from "@/types/service";

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
