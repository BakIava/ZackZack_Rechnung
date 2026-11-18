/**
 * Reine Logik für das, was sich der Browser zum Nachweis merkt (pro Firma,
 * nur auf diesem Gerät): Mitarbeiter mit Stundenpreis und die letzten Scans
 * samt Korrekturen. Das Lesen/Schreiben von localStorage liegt in
 * `nachweis-cache.ts`.
 */

import type {
  NachweisMitarbeiterGedaechtnis,
  NachweisScanEintrag,
  NachweisZeile,
} from "@/types/nachweis";

export const MAX_GEMERKTE_MITARBEITER = 100;
export const MAX_GEMERKTE_SCANS = 5;
export const SCAN_GUELTIG_MS = 30 * 24 * 60 * 60 * 1000;

export const LEERES_GEDAECHTNIS: NachweisMitarbeiterGedaechtnis = { workers: {}, aliases: {} };

/** Vergleichsschlüssel für Namen: Groß/klein, Leerzeichen, Akzente und „ı“ egal. */
export function nameSchluessel(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ");
}

/** Gemerkte Namen und Preise auf frisch gelesene Zeilen anwenden. */
export function gedaechtnisAnwenden(
  zeilen: NachweisZeile[],
  gedaechtnis: NachweisMitarbeiterGedaechtnis,
): NachweisZeile[] {
  return zeilen.map((zeile) => {
    const gelesen = nameSchluessel(zeile.name);
    if (!gelesen) return zeile;
    const eintrag = gedaechtnis.workers[gedaechtnis.aliases[gelesen] ?? gelesen];
    if (!eintrag) return zeile;
    return eintrag.preis
      ? { ...zeile, name: eintrag.name, preis: eintrag.preis, preisManuell: true }
      : { ...zeile, name: eintrag.name };
  });
}

/** Beim Übernehmen merken: Name → Preis, und gelesener Name → korrigierter Name. */
export function mitarbeiterMerken(
  gedaechtnis: NachweisMitarbeiterGedaechtnis,
  zeilen: NachweisZeile[],
  jetzt: number,
): NachweisMitarbeiterGedaechtnis {
  const workers = { ...gedaechtnis.workers };
  const aliases = { ...gedaechtnis.aliases };

  for (const zeile of zeilen) {
    const schluessel = nameSchluessel(zeile.name);
    if (!schluessel) continue;
    workers[schluessel] = { name: zeile.name.trim(), preis: zeile.preis, updatedAt: jetzt };
    const gelesen = nameSchluessel(zeile.gelesenName);
    if (gelesen && gelesen !== schluessel) aliases[gelesen] = schluessel;
  }

  const behalten = Object.entries(workers)
    .sort(([, a], [, b]) => b.updatedAt - a.updatedAt)
    .slice(0, MAX_GEMERKTE_MITARBEITER);
  const behaltenSchluessel = new Set(behalten.map(([schluessel]) => schluessel));
  return {
    workers: Object.fromEntries(behalten),
    aliases: Object.fromEntries(
      Object.entries(aliases).filter(([, ziel]) => behaltenSchluessel.has(ziel)),
    ),
  };
}

/** Abgelaufene Scans verwerfen, neueste zuerst. */
export function gueltigeScans(scans: NachweisScanEintrag[], jetzt: number): NachweisScanEintrag[] {
  return scans
    .filter((scan) => jetzt - scan.savedAt < SCAN_GUELTIG_MS)
    .sort((a, b) => b.savedAt - a.savedAt)
    .slice(0, MAX_GEMERKTE_SCANS);
}

/** Scan speichern bzw. aktualisieren (gleiche ID), höchstens fünf behalten. */
export function scanMerken(
  scans: NachweisScanEintrag[],
  eintrag: NachweisScanEintrag,
  jetzt: number,
): NachweisScanEintrag[] {
  return gueltigeScans([eintrag, ...scans.filter((scan) => scan.id !== eintrag.id)], jetzt);
}

/** Gemerktes Ergebnis vergessen, z. B. für „Neu lesen“ ohne vorliegende Datei. */
export function scanVergessen(scans: NachweisScanEintrag[], id: string): NachweisScanEintrag[] {
  return scans.filter((scan) => scan.id !== id);
}

/** Gleiche Datei schon gelesen? Dann ohne neuen KI-Aufruf wiederverwenden. */
export function scanZurDatei(
  scans: NachweisScanEintrag[],
  hash: string | null,
  jetzt: number,
): NachweisScanEintrag | null {
  if (!hash) return null;
  return gueltigeScans(scans, jetzt).find((scan) => scan.hash === hash) ?? null;
}
