import type { NachweisFreieZeile, NachweisLeseErgebnis, NachweisReviewDaten } from "@/types/nachweis";
import { readMitarbeiterGedaechtnis } from "./nachweis-cache";
import { freieStartZeilen } from "./nachweis-frei";
import { gedaechtnisAnwenden } from "./nachweis-gedaechtnis";
import { nachweisStartBeschreibung, nachweisStartZeilen } from "./nachweis-positionen";

/** Nur Tabellen-Komfort auf diesem Gerät. */
const LAST_PRICE_KEY = "zz-nachweis-last-price";

export function readLastPrice(): number | null {
  try {
    const value = Number(window.localStorage.getItem(LAST_PRICE_KEY));
    return Number.isInteger(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

export function writeLastPrice(cents: number | null): void {
  if (!cents) return;
  try {
    window.localStorage.setItem(LAST_PRICE_KEY, String(cents));
  } catch {
    // Die Vorbelegung ist nur Komfort.
  }
}

export function nachweisReviewStart(ergebnis: NachweisLeseErgebnis, scope: string): NachweisReviewDaten {
  if (ergebnis.variante === "frei") {
    return { variante: "frei", ergebnis, zeilen: freieStartZeilen(ergebnis) };
  }
  const { zeilen, material } = nachweisStartZeilen(ergebnis, readLastPrice());
  return {
    variante: "tabelle",
    ergebnis,
    beschreibung: nachweisStartBeschreibung(ergebnis),
    zeilen: gedaechtnisAnwenden(zeilen, readMitarbeiterGedaechtnis(scope)),
    material,
  };
}

export function neuerNachweisZeilenKey(zeilen: { key: string }[], prefix: string): string {
  const keys = new Set(zeilen.map((zeile) => zeile.key));
  let index = 1;
  while (keys.has(`${prefix}${index}`)) index += 1;
  return `${prefix}${index}`;
}

export function leereFreieZeile(zeilen: NachweisFreieZeile[]): NachweisFreieZeile {
  return {
    key: neuerNachweisZeilenKey(zeilen, "frei-neu:"),
    art: "leistung",
    descriptionDe: "",
    amount: null,
    unit: null,
    tage: [],
    tageEingabe: "",
    unsicher: [],
    unitPrice: null,
  };
}
