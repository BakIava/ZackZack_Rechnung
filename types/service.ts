/**
 * Leistungskatalog-Typen — abgeleitet aus `ServiceDbRow` (types/database.ts).
 *
 * Der Handwerker wählt eine Position in seiner Sprache, aufs Dokument kommt
 * IMMER der deutsche Begriff. Dokument-Rendering liest nie das übersetzte Feld.
 */

import type { Locale } from "@/i18n/routing";
import type { ServiceDbRow } from "./database";

/** DB-Row des Katalogs (Tabelle `services`). */
export type ServiceRow = ServiceDbRow;

/** UI-Modell eines Katalogeintrags (mehrsprachig, Preis in Cents). */
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

/** Eingabe für Anlegen/Bearbeiten einer Katalog-Leistung (Feldnamen wie DB). */
export type ServiceInput = Pick<ServiceDbRow, "description_de"> &
  Partial<Pick<ServiceDbRow, "description_tr" | "description_ar" | "unit" | "default_price">>;
