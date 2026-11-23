import {
  NACHWEIS_FREIE_ARTEN,
  NACHWEIS_UNSICHERHEITEN,
  type NachweisCacheEintrag,
  type NachweisErgebnis,
  type NachweisFreieLeistung,
  type NachweisFreieZeile,
  type NachweisFreiesErgebnis,
  type NachweisMaterial,
  type NachweisMaterialZeile,
  type NachweisMitarbeiter,
  type NachweisPruefung,
  type NachweisReviewDaten,
  type NachweisZeile,
} from "@/types/nachweis";
import { MAX_NACHWEIS_TAGE, istNachweisDatum } from "./nachweis-datum";
import { parseFreieTage } from "./nachweis-frei";

export function istObjekt(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const text = (v: unknown, max = 1000): v is string => typeof v === "string" && v.length <= max;
export const zahl = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const optionalZahl = (v: unknown): boolean => v === null || zahl(v);
const bool = (v: unknown): v is boolean => typeof v === "boolean";

function liste<T>(value: unknown, max: number, check: (v: unknown) => v is T): value is T[] {
  return Array.isArray(value) && value.length <= max && value.every(check);
}

function eindeutigeKeys(zeilen: { key: string }[]): boolean {
  return new Set(zeilen.map((zeile) => zeile.key)).size === zeilen.length;
}

function istMitarbeiter(v: unknown): v is NachweisMitarbeiter {
  return istObjekt(v) && text(v.key, 100) && text(v.name) && zahl(v.stunden) && bool(v.unsicher);
}

function istMaterial(v: unknown): v is NachweisMaterial {
  return istObjekt(v) && text(v.bezeichnung, 200) && text(v.einheit, 30) && zahl(v.anzahl);
}

function istMaterialZeile(v: unknown): v is NachweisMaterialZeile {
  return istMaterial(v) && "key" in v && text(v.key, 100) && "unitPrice" in v && optionalZahl(v.unitPrice);
}

function istZeile(v: unknown): v is NachweisZeile {
  return istMitarbeiter(v) && "gelesenName" in v && text(v.gelesenName) &&
    "preis" in v && optionalZahl(v.preis) && "preisManuell" in v && bool(v.preisManuell);
}

function istSummenTag(v: unknown): v is NachweisPruefung["tage"][number] {
  return istObjekt(v) && text(v.datum, 20) && zahl(v.gerechnet) && zahl(v.lautBlatt);
}

function istPruefung(v: unknown): v is NachweisPruefung {
  return istObjekt(v) && liste(v.tage, 31, istSummenTag) && zahl(v.gesamt) && zahl(v.gesamtLautBlatt) &&
    liste(v.abweichungen, 31, (tag): tag is string => text(tag, 20)) &&
    bool(v.gesamtAbweichung) && bool(v.vergleichbar) && bool(v.ok);
}

function istTabelle(v: unknown): v is NachweisErgebnis {
  return istObjekt(v) && text(v.nummer, 60) && text(v.projekt, 160) && text(v.arbeitsleistung, 500) &&
    (v.zeitraumVon === null || istNachweisDatum(v.zeitraumVon)) && (v.zeitraumBis === null || istNachweisDatum(v.zeitraumBis)) &&
    istPruefung(v.pruefung) && liste(v.mitarbeiter, 50, istMitarbeiter) && liste(v.material, 30, istMaterial);
}

function istLeistung(v: unknown): v is NachweisFreieLeistung & { key: string } {
  return istObjekt(v) && text(v.key, 100) &&
    NACHWEIS_FREIE_ARTEN.some((art) => art === v.art) &&
    text(v.descriptionDe, 200) && optionalZahl(v.amount) &&
    (v.unit === null || text(v.unit, 30)) && liste(v.tage, MAX_NACHWEIS_TAGE, istNachweisDatum) &&
    liste(v.unsicher, NACHWEIS_UNSICHERHEITEN.length, (flag): flag is NachweisFreieLeistung["unsicher"][number] =>
      NACHWEIS_UNSICHERHEITEN.some((eintrag) => eintrag === flag));
}

function istFreieZeile(v: unknown): v is NachweisFreieZeile {
  return istLeistung(v) && "tageEingabe" in v && text(v.tageEingabe, 400) &&
    "unitPrice" in v && optionalZahl(v.unitPrice);
}

function istFreiesErgebnis(v: unknown): v is NachweisFreiesErgebnis {
  return istObjekt(v) && v.variante === "frei" && text(v.nummer, 60) && optionalZahl(v.stundenLautBlatt) &&
    liste(v.leistungen, 100, istLeistung) && eindeutigeKeys(v.leistungen);
}

function leseTabelle(v: Record<string, unknown>): NachweisReviewDaten | null {
  const { ergebnis, beschreibung, zeilen, material } = v;
  if (!istTabelle(ergebnis) || !text(beschreibung, 200) ||
    !liste(zeilen, 500, istZeile) || !eindeutigeKeys(zeilen) ||
    !liste(material, 30, istMaterialZeile) || !eindeutigeKeys(material)) return null;
  return { variante: "tabelle", ergebnis, beschreibung, zeilen, material };
}

function leseReview(v: unknown): NachweisReviewDaten | null {
  if (!istObjekt(v)) return null;
  if (v.variante === "tabelle") return leseTabelle(v);
  if (v.variante !== "frei" || !istFreiesErgebnis(v.ergebnis) ||
    !liste(v.zeilen, 500, istFreieZeile) || !eindeutigeKeys(v.zeilen)) return null;
  const zeilen = v.zeilen.flatMap((zeile): NachweisFreieZeile[] => {
    // Im alten Review abgewählte Positionen bleiben beim Wiederöffnen ausgeschlossen.
    if ("ausgewaehlt" in zeile && zeile.ausgewaehlt === false) return [];
    const { key, art, descriptionDe, amount, unit, tage, unsicher, unitPrice, tageEingabe } = zeile;
    return [{
      key, art, descriptionDe, amount, unit, tage, unsicher, unitPrice,
      tageEingabe: parseFreieTage(tageEingabe) === null ? "" : tageEingabe,
    }];
  });
  return { variante: "frei", ergebnis: v.ergebnis, zeilen };
}

export function leseCacheScan(value: unknown, version: 1 | 2): NachweisCacheEintrag | null {
  if (!istObjekt(value)) return null;
  const { id, hash, savedAt } = value;
  if (!text(id, 100) || !id || !zahl(savedAt) || savedAt <= 0 ||
    (hash !== null && (typeof hash !== "string" || !/^[a-f0-9]{64}$/.test(hash)))) return null;
  const review = version === 1 ? leseTabelle(value) : leseReview(value.review);
  return review ? { id, hash, savedAt, review } : null;
}
