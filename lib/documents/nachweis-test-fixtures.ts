import type { NachweisEintrag, NachweisExtraction } from "@/types/nachweis";

const TAGE = [
  "2026-09-07",
  "2026-09-08",
  "2026-09-09",
  "2026-09-10",
  "2026-09-11",
  "2026-09-12",
];

function zeile(werte: (number | "-" | "x")[]): NachweisEintrag[] {
  return werte.map((wert, index) => ({
    datum: TAGE[index],
    stunden: typeof wert === "number" ? wert : 0,
    zelle: wert === "-" ? "leer" : wert === "x" ? "durchgestrichen" : "zahl",
    unsicher: false,
  }));
}

/** Nachweis 2026-040 (Data Center Mainz), so wie Sonnet ihn gelesen hat. */
export function beispielNachweis(): NachweisExtraction {
  return {
    ausrichtung: "aufrecht",
    nummer: "2026-040",
    projekt: "Data Center Mainz",
    tage: [24, 24, 32, 32, 32, 36].map((gesamtLautBlatt, index) => ({
      datum: TAGE[index],
      gesamtLautBlatt,
    })),
    mitarbeiter: [
      { name: "Saygili", eintraege: zeile([8, 8, 8, 8, 8, "x"]) },
      { name: "Esref", eintraege: zeile(["-", "-", 8, 8, 8, 12]) },
      { name: "Nezih", eintraege: zeile([8, 8, 8, 8, 8, 12]) },
      { name: "Talal", eintraege: zeile([8, 8, 8, 8, 8, 12]) },
    ],
    gesamtSummeLautBlatt: 180,
    material: [],
    arbeitsleistung: "EG und 1.06 633 arbeit, Kabel mörtel 611",
  };
}
