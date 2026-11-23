import type {
  NachweisFreieExtraktion,
  NachweisFreieZeile,
  NachweisFreiesErgebnis,
  NachweisImportLine,
} from "@/types/nachweis";
import { istNachweisDatum, MAX_NACHWEIS_TAGE, normalisiereNachweisZiffern } from "./nachweis-datum";
import { MAX_NACHWEIS_IMPORT_LINES, parseNachweisImportLine, parseNachweisMenge } from "./nachweis-import";
import { NACHWEIS_STUNDEN_EINHEIT, nachweisZeitraumText } from "./nachweis-positionen";
import { round2 } from "./nachweis-pruefung";

const STUNDEN_EINHEITEN = [NACHWEIS_STUNDEN_EINHEIT.toLowerCase(), "std", "stunden", "h"];

export function freiesNachweisErgebnis(extraktion: NachweisFreieExtraktion): NachweisFreiesErgebnis {
  return {
    variante: "frei",
    nummer: extraktion.nummer,
    stundenLautBlatt: extraktion.stundenLautBlatt,
    leistungen: extraktion.leistungen.map((leistung, index) => ({ ...leistung, key: `frei:${index}` })),
  };
}

export function freieStartZeilen(ergebnis: NachweisFreiesErgebnis): NachweisFreieZeile[] {
  return ergebnis.leistungen.map((leistung) => ({
    ...leistung,
    tageEingabe: leistung.tage.join(", "),
    unitPrice: null,
  }));
}

export function parseFreieTage(text: string): string[] | null {
  if (!text.trim()) return [];
  const tage = normalisiereNachweisZiffern(text).split(/[,،]/).map((tag) => tag.trim());
  if (tage.length > MAX_NACHWEIS_TAGE || !tage.every(istNachweisDatum)) return null;
  return [...new Set(tage)].sort();
}

export function freieNachweisBereitschaft(nummer: string, zeilen: NachweisFreieZeile[]) {
  const vorschlaege = zeilen.map((zeile) => {
    const tage = parseFreieTage(zeile.tageEingabe);
    const zusatz = [
      nummer ? `lt. Arbeitsnachweis Nr. ${nummer}` : "",
      ...(tage ?? []).map((tag) => nachweisZeitraumText(tag, tag)),
    ].filter(Boolean).join(", ");
    const position = parseNachweisImportLine({
      kind: "free",
      descriptionDe: zeile.descriptionDe,
      amount: zeile.amount,
      unit: zeile.unit,
      unitPrice: zeile.unitPrice,
      additionalDescriptionDe: zusatz || null,
    });
    const felderGueltig =
      position !== null && tage !== null &&
      (position.unit.toLowerCase() !== "pauschale" || zeile.amount === 1);
    return { zeile, position: felderGueltig ? position : null, zusatz: zusatz || null };
  });
  const limit = vorschlaege.length > MAX_NACHWEIS_IMPORT_LINES;
  const lines: NachweisImportLine[] = [];
  for (const vorschlag of vorschlaege) {
    if (vorschlag.position) lines.push(vorschlag.position);
  }
  const vollstaendig = !limit && lines.length > 0 && lines.length === zeilen.length;
  return { vorschlaege, limit, vollstaendig, lines: vollstaendig ? lines : [] };
}

/** Nur mit einer ausdrücklich notierten vergleichbaren Gesamtstundenzahl verwenden. */
export function freieGesamtStunden(zeilen: NachweisFreieZeile[]): number {
  return round2(zeilen.reduce((sum, zeile) => {
    const stunden = parseNachweisMenge(zeile.amount);
    const einheit = zeile.unit?.trim().toLowerCase() ?? "";
    if (stunden === null || !STUNDEN_EINHEITEN.includes(einheit)) return sum;
    return sum + stunden;
  }, 0));
}
