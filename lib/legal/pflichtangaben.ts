/**
 * Pflichtangaben-Check (Ampel) vor jedem Export.
 * Export ist erst zulässig, wenn alle Items grün sind.
 */

import { braucht19Hinweis } from "@/lib/legal/mwst";

export type AmpelKey =
  | "aussteller"
  | "empfaenger"
  | "steuernummer"
  | "datum"
  | "leistung"
  | "betrag"
  | "nummer"
  | "kleinunternehmer";

export interface AmpelItem {
  key: AmpelKey;
  ok: boolean;
}

export interface PflichtangabenInput {
  ausstellerName: string;
  empfaengerName: string;
  steuernummer: string;
  datum: string;
  hatLeistung: boolean;
  betragCents: number;
  rechnungsnummer: string | null;
  /** true, wenn auf dem Dokument MwSt. ausgewiesen wird */
  mwstAusgewiesen: boolean;
  kleinunternehmerHinweisGesetzt: boolean;
}

function notEmpty(value: string): boolean {
  return value.trim().length > 0;
}

export function pruefePflichtangaben(input: PflichtangabenInput): AmpelItem[] {
  const items: AmpelItem[] = [
    { key: "aussteller", ok: notEmpty(input.ausstellerName) },
    { key: "empfaenger", ok: notEmpty(input.empfaengerName) },
    { key: "steuernummer", ok: notEmpty(input.steuernummer) },
    { key: "datum", ok: notEmpty(input.datum) },
    { key: "leistung", ok: input.hatLeistung },
    { key: "betrag", ok: input.betragCents > 0 },
    { key: "nummer", ok: input.rechnungsnummer !== null && notEmpty(input.rechnungsnummer) },
  ];

  // §19-Hinweis ist nur dann Pflicht, wenn keine MwSt. ausgewiesen wird.
  if (braucht19Hinweis(input.mwstAusgewiesen)) {
    items.push({
      key: "kleinunternehmer",
      ok: input.kleinunternehmerHinweisGesetzt,
    });
  }

  return items;
}

export function istExportierbar(items: AmpelItem[]): boolean {
  return items.length > 0 && items.every((item) => item.ok);
}
