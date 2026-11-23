import type { NachweisFreieLeistung } from "@/types/nachweis";

export function freieLeistung(patch: Partial<NachweisFreieLeistung> = {}): NachweisFreieLeistung {
  return { art: "leistung", descriptionDe: "Wandöffnung schließen", amount: 3, unit: "Std.", tage: [], unsicher: [], ...patch };
}

export function freieKalendernotiz() {
  return {
    variante: "frei",
    ausrichtung: "aufrecht",
    nachweis_nummer: "",
    stunden_laut_blatt: 6.5,
    leistungen: [
      freieLeistung({ tage: ["2026-11-09"] }),
      freieLeistung({ descriptionDe: "Fliesen verfugen", amount: 2.5, tage: ["2026-11-10"] }),
      freieLeistung({ descriptionDe: "Fugen abdichten", amount: 1, tage: ["2026-11-13"], unsicher: ["tage"] }),
      freieLeistung({ art: "material", descriptionDe: "Mauerstein 7,5 cm", amount: null, unit: null }),
      freieLeistung({ art: "anfahrt", descriptionDe: "Anfahrt", amount: 3, unit: "Fahrt", unsicher: ["menge"] }),
    ],
  };
}

export function freieAbrechnung() {
  return {
    ...freieKalendernotiz(),
    stunden_laut_blatt: null,
    leistungen: [
      freieLeistung({ descriptionDe: "Baustelle einrichten", amount: 1, unit: "Pauschale" }),
      freieLeistung({ descriptionDe: "Boden ausgleichen", amount: 25, unit: "m²" }),
      freieLeistung({ descriptionDe: "Sockelfliesen zuschneiden und verfugen", amount: 14, unit: null }),
    ],
  };
}
