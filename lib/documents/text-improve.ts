/**
 * Reine Regeln für „Text verbessern“: Eingabe prüfen und den Vorschlag der KI
 * absichern. Claude schlägt nur vor – ob der Vorschlag taugt, entscheidet
 * dieser Code, übernehmen muss ihn der Nutzer selbst.
 */

import type { TextImproveFeld, TextImproveKiAntwort, TextImproveResult } from "@/types/text-improve";
import { normalisiereNachweisZiffern } from "./nachweis-datum";

export const TEXT_IMPROVE_MIN_LENGTH = 2;
export const TEXT_IMPROVE_MAX_LENGTH: Record<TextImproveFeld, number> = {
  bezeichnung: 200,
  zusatztext: 1000,
};

export function istTextImproveFeld(value: unknown): value is TextImproveFeld {
  return value === "bezeichnung" || value === "zusatztext";
}

/** Kurz genug zum Verbessern? Gilt im Browser (Knopf aktiv) und auf dem Server. */
export function istTextImproveLaenge(text: string, feld: TextImproveFeld): boolean {
  const length = text.trim().length;
  return length >= TEXT_IMPROVE_MIN_LENGTH && length <= TEXT_IMPROVE_MAX_LENGTH[feld];
}

export function validiereTextImproveEingabe(
  text: unknown,
  feld: unknown,
): { text: string; feld: TextImproveFeld } | null {
  if (typeof text !== "string" || !istTextImproveFeld(feld) || !istTextImproveLaenge(text, feld)) {
    return null;
  }
  return { text: text.trim(), feld };
}

/** „m2“/„m3“ sind Einheiten, keine Zahlen – sonst würde „12 m2“ → „12 m²“ verworfen. */
const HOCHZAHL_NACH_M = /(?<=m)[23](?!\d)/gi;
const ZAHL = /\d+(?:[.,]\d+)*/g;

/**
 * Alle Zahlen eines Texts, vergleichbar gemacht: arabische Ziffern als 0–9,
 * Komma wie Punkt, „2,50“ wie „2.5“. Sortiert, damit nur die Menge zählt.
 */
export function zahlenImText(text: string): string[] {
  const ohneHochzahlen = normalisiereNachweisZiffern(text).replace(HOCHZAHL_NACH_M, "");
  return (ohneHochzahlen.match(ZAHL) ?? [])
    .map((zahl) => {
      const punkt = zahl.replace(/,/g, ".");
      return /^\d+(?:\.\d+)?$/.test(punkt) ? String(Number(punkt)) : punkt;
    })
    .sort();
}

function gleicheZahlen(a: string, b: string): boolean {
  const links = zahlenImText(a);
  const rechts = zahlenImText(b);
  return links.length === rechts.length && links.every((zahl, index) => zahl === rechts[index]);
}

/** Bezeichnungen sind einzeilig; Zusatztexte behalten ihre Zeilen. */
function normalisiereVorschlag(text: string, feld: TextImproveFeld): string {
  const trimmed = text.trim();
  return feld === "bezeichnung" ? trimmed.replace(/\s*\n\s*/g, " ") : trimmed;
}

/**
 * Bewertet die KI-Antwort. Ein Vorschlag mit geänderten, fehlenden oder neuen
 * Zahlen wird verworfen – Mengen, Maße und Nummern ändert nur der Nutzer.
 */
export function bewerteTextVorschlag(
  eingabe: string,
  antwort: TextImproveKiAntwort,
  feld: TextImproveFeld,
): TextImproveResult {
  if (!antwort.deutsch) return { status: "kein_deutsch" };
  const vorschlag = normalisiereVorschlag(antwort.textDe, feld);
  if (!istTextImproveLaenge(vorschlag, feld)) return { status: "fehler" };
  if (!gleicheZahlen(eingabe, vorschlag)) return { status: "fehler" };
  if (vorschlag === eingabe.trim()) return { status: "unveraendert" };
  return { status: "vorschlag", text: vorschlag };
}
