import { describe, expect, it } from "vitest";
import type { NachweisMaterialZeile, NachweisZeile } from "@/types/nachweis";
import { beispielNachweis } from "./nachweis-test-fixtures";
import { nachweisErgebnis } from "./nachweis-pruefung";
import {
  nachweisGesamtStunden,
  nachweisImportZeilen,
  nachweisPreisSetzen,
  nachweisStartBeschreibung,
  nachweisStartZeilen,
  nachweisVorschlaege,
  nachweisZeitraumText,
} from "./nachweis-positionen";

const NAMEN = ["Saygili", "Esref", "Nezih", "Talal"];
const ergebnis = nachweisErgebnis(beispielNachweis());
const ZUSATZ = "lt. Stundennachweis Nr. 2026-040, 07.09.–12.09.2026, Data Center Mainz";
const TEXT = "633 636 611 Arbeit EG/1.OG";

function zeilenMit(preise: (number | null)[]): NachweisZeile[] {
  return nachweisStartZeilen(ergebnis, null).zeilen.map((zeile, index) => ({
    ...zeile,
    preis: preise[index],
  }));
}

function vorschlaege(zeilen: NachweisZeile[], material: NachweisMaterialZeile[] = []) {
  return nachweisVorschlaege({ kopf: ergebnis, beschreibung: TEXT, zeilen, material });
}

describe("Startwerte", () => {
  it("übernimmt Namen, Stunden und für alle denselben Startpreis", () => {
    const { zeilen } = nachweisStartZeilen(ergebnis, 4800);
    expect(zeilen.map((z) => [z.name, z.stunden, z.preis, z.preisManuell])).toEqual([
      ["Saygili", 40, 4800, false],
      ["Esref", 36, 4800, false],
      ["Nezih", 52, 4800, false],
      ["Talal", 52, 4800, false],
    ]);
    expect(nachweisGesamtStunden(zeilen)).toBe(180);
  });

  it("schlägt den Text unter „Arbeitsleistungen“ als Beschreibung vor", () => {
    expect(nachweisStartBeschreibung(ergebnis)).toBe("EG und 1.06 633 arbeit, Kabel mörtel 611");
    expect(nachweisStartBeschreibung({ arbeitsleistung: "  " })).toBe("Arbeitsstunden");
  });
});

describe("nachweisPreisSetzen", () => {
  it("überträgt den ersten eingetippten Preis auf alle noch nicht geänderten Zeilen", () => {
    const zeilen = nachweisPreisSetzen(zeilenMit([null, null, null, null]), "m0", 4800);
    expect(zeilen.map((z) => z.preis)).toEqual([4800, 4800, 4800, 4800]);
    expect(zeilen.map((z) => z.preisManuell)).toEqual([true, false, false, false]);
  });

  it("lässt selbst geänderte Zeilen danach in Ruhe", () => {
    let zeilen = nachweisPreisSetzen(zeilenMit([null, null, null, null]), "m0", 4800);
    zeilen = nachweisPreisSetzen(zeilen, "m3", 3800);
    zeilen = nachweisPreisSetzen(zeilen, "m0", 5000);
    expect(zeilen.map((z) => z.preis)).toEqual([5000, 5000, 5000, 3800]);
  });
});

describe("nachweisVorschlaege", () => {
  it("macht bei gleichem Preis eine Position mit der Beschreibung des Nutzers", () => {
    expect(vorschlaege(zeilenMit([4800, 4800, 4800, 4800]))).toEqual([
      {
        key: "std:4800",
        quelle: "stunden",
        descriptionDe: TEXT,
        unit: "Std.",
        amount: 180,
        unitPrice: 4800,
        additionalDescriptionDe: ZUSATZ,
      },
    ]);
  });

  it("bildet eine Position je Stundenpreis in der Reihenfolge des ersten Vorkommens", () => {
    const result = vorschlaege(zeilenMit([5500, 4800, 4800, 3800]));
    expect(result.map((v) => [v.unitPrice, v.amount])).toEqual([
      [5500, 40],
      [4800, 88],
      [3800, 52],
    ]);
  });

  it("nutzt „Arbeitsstunden“, wenn die Beschreibung leer ist", () => {
    const result = nachweisVorschlaege({
      kopf: ergebnis,
      beschreibung: "   ",
      zeilen: zeilenMit([4800, 4800, 4800, 4800]),
      material: [],
    });
    expect(result[0].descriptionDe).toBe("Arbeitsstunden");
  });

  it("rechnet mit korrigierten Stunden und ignoriert leere oder gelöschte Zeilen", () => {
    const zeilen = zeilenMit([4800, 4800, 4800, 4800]);
    zeilen[0] = { ...zeilen[0], stunden: 38.5 };
    zeilen[1] = { ...zeilen[1], stunden: 0 };
    expect(vorschlaege(zeilen.slice(0, 3))[0].amount).toBe(90.5);
  });

  it("schreibt nie Mitarbeiternamen in Positionen", () => {
    const text = JSON.stringify(vorschlaege(zeilenMit([5500, null, 4800, 3800])));
    for (const name of NAMEN) expect(text).not.toContain(name);
  });

  it("macht aus Material je Zeile eine Position ohne Zusatztext", () => {
    const material = [{ key: "mat:0", bezeichnung: "Kabelmörtel", anzahl: 3, einheit: "Sack", unitPrice: 1290 }];
    expect(vorschlaege([], material)).toEqual([
      {
        key: "mat:0",
        quelle: "material",
        descriptionDe: "Kabelmörtel",
        unit: "Sack",
        amount: 3,
        unitPrice: 1290,
        additionalDescriptionDe: null,
      },
    ]);
  });
});

describe("nachweisImportZeilen", () => {
  it("ist erst vollständig, wenn jede Position einen Preis hat", () => {
    expect(nachweisImportZeilen(vorschlaege(zeilenMit([4800, null, null, null]))).vollstaendig).toBe(false);

    const result = nachweisImportZeilen(vorschlaege(zeilenMit([5500, 4800, 4800, 4800])));
    expect(result.vollstaendig).toBe(true);
    expect(result.lines).toEqual([
      { kind: "free", descriptionDe: TEXT, amount: 40, unit: "Std.", unitPrice: 5500, additionalDescriptionDe: ZUSATZ },
      { kind: "free", descriptionDe: TEXT, amount: 140, unit: "Std.", unitPrice: 4800, additionalDescriptionDe: ZUSATZ },
    ]);
  });

  it("ist ohne Positionen nicht vollständig", () => {
    expect(nachweisImportZeilen([])).toEqual({ lines: [], vollstaendig: false });
  });
});

describe("nachweisZeitraumText", () => {
  it("formatiert Zeiträume ohne Zeitzonenverschiebung", () => {
    expect(nachweisZeitraumText("2026-09-07", "2026-09-12")).toBe("07.09.–12.09.2026");
    expect(nachweisZeitraumText("2026-12-29", "2027-01-02")).toBe("29.12.2026–02.01.2027");
    expect(nachweisZeitraumText("2026-09-07", "2026-09-07")).toBe("07.09.2026");
    expect(nachweisZeitraumText(null, null)).toBe("");
  });
});
