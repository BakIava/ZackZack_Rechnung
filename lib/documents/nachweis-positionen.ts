import type {
  NachweisErgebnis,
  NachweisImportLine,
  NachweisMaterialZeile,
  NachweisVorschlag,
  NachweisZeile,
} from "@/types/nachweis";
import { MAX_NACHWEIS_DESCRIPTION } from "./nachweis-import";
import { round2 } from "./nachweis-pruefung";

/** Dokumenttexte sind immer Deutsch, unabhängig von der Bediensprache. */
export const NACHWEIS_STUNDEN_TEXT = "Arbeitsstunden";
export const NACHWEIS_STUNDEN_EINHEIT = "Std.";
const MATERIAL_EINHEIT = "Stk.";

type NachweisKopf = Pick<NachweisErgebnis, "nummer" | "projekt" | "zeitraumVon" | "zeitraumBis">;

function deDatum(iso: string, mitJahr: boolean): string {
  const [jahr, monat, tag] = iso.split("-");
  return mitJahr ? `${tag}.${monat}.${jahr}` : `${tag}.${monat}.`;
}

/** „07.09.–12.09.2026“; ohne Zeitzonen-Umrechnung, da reine Kalenderdaten. */
export function nachweisZeitraumText(von: string | null, bis: string | null): string {
  if (!von || !bis) return "";
  if (von === bis) return deDatum(von, true);
  const gleichesJahr = von.slice(0, 4) === bis.slice(0, 4);
  return `${deDatum(von, !gleichesJahr)}–${deDatum(bis, true)}`;
}

/** Zusatztext jeder Stundenposition – deterministisch und ohne Mitarbeiternamen. */
export function nachweisZusatztext(kopf: NachweisKopf): string {
  const teile = [kopf.nummer ? `lt. Stundennachweis Nr. ${kopf.nummer}` : "lt. Stundennachweis"];
  const zeitraum = nachweisZeitraumText(kopf.zeitraumVon, kopf.zeitraumBis);
  if (zeitraum) teile.push(zeitraum);
  if (kopf.projekt) teile.push(kopf.projekt);
  return teile.join(", ");
}

/** Vorschlag für den Positionstext: was unter „Arbeitsleistungen“ steht, sonst „Arbeitsstunden“. */
export function nachweisStartBeschreibung(ergebnis: Pick<NachweisErgebnis, "arbeitsleistung">): string {
  return ergebnis.arbeitsleistung.trim().slice(0, MAX_NACHWEIS_DESCRIPTION) || NACHWEIS_STUNDEN_TEXT;
}

/** Bearbeitbare Zeilen aus dem Leseergebnis; alle starten mit demselben Stundenpreis. */
export function nachweisStartZeilen(
  ergebnis: NachweisErgebnis,
  startPreis: number | null,
): { zeilen: NachweisZeile[]; material: NachweisMaterialZeile[] } {
  return {
    zeilen: ergebnis.mitarbeiter.map((mitarbeiter) => ({
      key: mitarbeiter.key,
      name: mitarbeiter.name,
      stunden: mitarbeiter.stunden,
      preis: startPreis,
      preisManuell: false,
      unsicher: mitarbeiter.unsicher,
    })),
    material: ergebnis.material.map((entry, index) => ({
      key: `mat:${index}`,
      bezeichnung: entry.bezeichnung,
      anzahl: entry.anzahl > 0 ? entry.anzahl : 1,
      einheit: entry.einheit || MATERIAL_EINHEIT,
      unitPrice: null,
    })),
  };
}

/**
 * Preis in einer Zeile eintippen: Diese Zeile behält ihn fest, alle Zeilen,
 * die noch nicht selbst geändert wurden, übernehmen ihn mit. So reicht bei
 * gleichem Satz eine Eingabe, abweichende Sätze bleiben trotzdem möglich.
 */
export function nachweisPreisSetzen(
  zeilen: NachweisZeile[],
  key: string,
  preis: number | null,
): NachweisZeile[] {
  return zeilen.map((zeile) => {
    if (zeile.key === key) return { ...zeile, preis, preisManuell: true };
    return zeile.preisManuell ? zeile : { ...zeile, preis };
  });
}

export function nachweisGesamtStunden(zeilen: NachweisZeile[]): number {
  return round2(zeilen.reduce((sum, zeile) => sum + Math.max(0, zeile.stunden), 0));
}

interface NachweisVorschlagInput {
  kopf: NachweisKopf;
  /** Positionstext der Stundenpositionen, vom Nutzer änderbar. */
  beschreibung: string;
  zeilen: NachweisZeile[];
  material: NachweisMaterialZeile[];
}

/**
 * Eine Stundenposition je Stundenpreis (Reihenfolge = erstes Vorkommen),
 * Material je Zeile. Preise kommen ausschließlich vom Nutzer – nie vom Modell.
 */
export function nachweisVorschlaege({
  kopf,
  beschreibung,
  zeilen,
  material,
}: NachweisVorschlagInput): NachweisVorschlag[] {
  const zusatz = nachweisZusatztext(kopf);
  const text = beschreibung.trim() || NACHWEIS_STUNDEN_TEXT;
  const gruppen = new Map<string, NachweisVorschlag>();

  for (const zeile of zeilen) {
    if (!(zeile.stunden > 0)) continue;
    const preis = zeile.preis !== null && zeile.preis > 0 ? zeile.preis : null;
    const key = `std:${preis ?? "offen"}`;
    const vorhanden = gruppen.get(key);
    if (vorhanden) {
      vorhanden.amount = round2(vorhanden.amount + zeile.stunden);
      continue;
    }
    gruppen.set(key, {
      key,
      quelle: "stunden",
      descriptionDe: text,
      unit: NACHWEIS_STUNDEN_EINHEIT,
      amount: round2(zeile.stunden),
      unitPrice: preis,
      additionalDescriptionDe: zusatz,
    });
  }

  const materialVorschlaege = material.flatMap((zeile): NachweisVorschlag[] =>
    zeile.bezeichnung.trim() && zeile.anzahl > 0
      ? [{
          key: zeile.key,
          quelle: "material",
          descriptionDe: zeile.bezeichnung.trim(),
          unit: zeile.einheit || MATERIAL_EINHEIT,
          amount: round2(zeile.anzahl),
          unitPrice: zeile.unitPrice,
          additionalDescriptionDe: null,
        }]
      : [],
  );

  return [...gruppen.values(), ...materialVorschlaege];
}

/** Übernehmbar erst, wenn es Positionen gibt und jede einen Preis hat. */
export function nachweisImportZeilen(
  vorschlaege: NachweisVorschlag[],
): { lines: NachweisImportLine[]; vollstaendig: boolean } {
  const lines = vorschlaege.flatMap((vorschlag): NachweisImportLine[] =>
    vorschlag.unitPrice !== null && vorschlag.unitPrice > 0
      ? [{
          kind: "free",
          descriptionDe: vorschlag.descriptionDe,
          amount: vorschlag.amount,
          unit: vorschlag.unit,
          unitPrice: vorschlag.unitPrice,
          additionalDescriptionDe: vorschlag.additionalDescriptionDe,
        }]
      : [],
  );
  return {
    lines,
    vollstaendig: lines.length > 0 && lines.length === vorschlaege.length,
  };
}
