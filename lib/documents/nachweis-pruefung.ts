import { istNachweisDatum } from "./nachweis-datum";
import type {
  NachweisEintrag,
  NachweisErgebnis,
  NachweisExtraction,
  NachweisMitarbeiter,
  NachweisPruefung,
} from "@/types/nachweis";


/** Zwei Nachkommastellen genügen für Stunden und vermeiden Float-Reste (7,5 + 0,25). */
export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function gleich(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.001;
}

/** Nur lesbare Zahlen zählen; leer, durchgestrichen und unleserlich sind 0. */
function zellenStunden(eintrag: NachweisEintrag): number {
  return eintrag.zelle === "zahl" ? eintrag.stunden : 0;
}

/** Rechnet die Tages- und Gesamtsummen selbst und vergleicht mit der Gesamtzeile des Blatts. */
export function pruefeNachweis(extraction: NachweisExtraction): NachweisPruefung {
  const proTag = new Map<string, number>();
  let gesamt = 0;
  for (const mitarbeiter of extraction.mitarbeiter) {
    for (const eintrag of mitarbeiter.eintraege) {
      const stunden = zellenStunden(eintrag);
      if (stunden <= 0) continue;
      proTag.set(eintrag.datum, (proTag.get(eintrag.datum) ?? 0) + stunden);
      gesamt += stunden;
    }
  }

  const tage = extraction.tage.map((tag) => ({
    datum: tag.datum,
    gerechnet: round2(proTag.get(tag.datum) ?? 0),
    lautBlatt: tag.gesamtLautBlatt,
  }));
  // Eine leere Tagessumme (0) gilt als „nicht ausgefüllt“ und wird nicht verglichen.
  const abweichungen = tage
    .filter((tag) => tag.lautBlatt > 0 && !gleich(tag.lautBlatt, tag.gerechnet))
    .map((tag) => tag.datum);
  const gesamtLautBlatt = extraction.gesamtSummeLautBlatt;
  const gesamtGerechnet = round2(gesamt);
  const gesamtAbweichung = gesamtLautBlatt > 0 && !gleich(gesamtLautBlatt, gesamtGerechnet);
  const vergleichbar = gesamtLautBlatt > 0 || tage.some((tag) => tag.lautBlatt > 0);

  return {
    tage,
    gesamt: gesamtGerechnet,
    gesamtLautBlatt,
    abweichungen,
    gesamtAbweichung,
    vergleichbar,
    ok: vergleichbar && abweichungen.length === 0 && !gesamtAbweichung,
  };
}

/** Stundensumme je Mitarbeiter – nur für die Anzeige im Prüfschritt. */
export function nachweisMitarbeiter(extraction: NachweisExtraction): NachweisMitarbeiter[] {
  return extraction.mitarbeiter.map((mitarbeiter, index) => ({
    key: `m${index}`,
    name: mitarbeiter.name,
    stunden: round2(
      mitarbeiter.eintraege.reduce((sum, eintrag) => sum + zellenStunden(eintrag), 0),
    ),
    unsicher: mitarbeiter.eintraege.some(
      (eintrag) => eintrag.unsicher || eintrag.zelle === "unleserlich",
    ),
  }));
}

/** Erster und letzter Tag mit tatsächlich gearbeiteten Stunden. */
export function nachweisZeitraum(
  extraction: NachweisExtraction,
): { von: string | null; bis: string | null } {
  const daten = extraction.mitarbeiter
    .flatMap((mitarbeiter) => mitarbeiter.eintraege)
    .filter((eintrag) => zellenStunden(eintrag) > 0 && istNachweisDatum(eintrag.datum))
    .map((eintrag) => eintrag.datum)
    .sort();
  return daten.length > 0
    ? { von: daten[0], bis: daten[daten.length - 1] }
    : { von: null, bis: null };
}

export function nachweisErgebnis(extraction: NachweisExtraction): NachweisErgebnis {
  const zeitraum = nachweisZeitraum(extraction);
  return {
    nummer: extraction.nummer,
    projekt: extraction.projekt,
    zeitraumVon: zeitraum.von,
    zeitraumBis: zeitraum.bis,
    pruefung: pruefeNachweis(extraction),
    mitarbeiter: nachweisMitarbeiter(extraction),
    material: extraction.material.filter((entry) => entry.bezeichnung.length > 0),
    arbeitsleistung: extraction.arbeitsleistung,
  };
}

/** Gesamtstunden laut Blatt (Gesamtsumme, sonst Summe der Tageszeilen); null ohne Gesamtzeile. */
export function nachweisBlattGesamt(pruefung: NachweisPruefung): number | null {
  if (pruefung.gesamtLautBlatt > 0) return pruefung.gesamtLautBlatt;
  const tage = round2(pruefung.tage.reduce((sum, tag) => sum + tag.lautBlatt, 0));
  return tage > 0 ? tage : null;
}

/** Live-Abgleich im Prüfschritt: stimmen die (ggf. korrigierten) Stunden mit dem Blatt? */
export function stimmtMitBlatt(pruefung: NachweisPruefung, aktuell: number): boolean | null {
  const blatt = nachweisBlattGesamt(pruefung);
  return blatt === null ? null : gleich(blatt, round2(aktuell));
}
