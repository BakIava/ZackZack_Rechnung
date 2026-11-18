import { describe, expect, it } from "vitest";
import type { NachweisMaterialZeile, NachweisZeile } from "@/types/nachweis";
import { beispielNachweis } from "./nachweis-test-fixtures";
import { nachweisErgebnis } from "./nachweis-pruefung";
import {
  nachweisGesamtStunden,
  nachweisImportZeilen,
  nachweisSatzOptionen,
  nachweisStartSatz,
  nachweisStartZeilen,
  nachweisVorschlaege,
  nachweisZeitraumText,
  type NachweisSatz,
} from "./nachweis-positionen";

const VORARBEITER: NachweisSatz = { id: "svc-va", de: "Vorarbeiterstunde", einheit: "Std.", preisCents: 5500 };
const MONTEUR: NachweisSatz = { id: "svc-mo", de: "Monteurstunde", einheit: "Std.", preisCents: 4800 };
const HELFER: NachweisSatz = { id: "svc-he", de: "Helferstunde", einheit: "Std.", preisCents: 3800 };
const PAUSCHALE: NachweisSatz = { id: "svc-pa", de: "Anfahrt", einheit: "Pauschale", preisCents: 3000 };
const SERVICES = [VORARBEITER, MONTEUR, HELFER, PAUSCHALE];
const NAMEN = ["Saygili", "Esref", "Nezih", "Talal"];

const ergebnis = nachweisErgebnis(beispielNachweis());
const ZUSATZ = "lt. Stundennachweis Nr. 2026-040, 07.09.–12.09.2026, Data Center Mainz";

function zeilenMit(saetze: (string | null)[]): NachweisZeile[] {
  return nachweisStartZeilen(ergebnis, null).zeilen.map((zeile, index) => ({
    ...zeile,
    serviceId: saetze[index],
  }));
}

function vorschlaege(
  zeilen: NachweisZeile[],
  material: NachweisMaterialZeile[] = [],
  eigenerPreis: number | null = null,
) {
  return nachweisVorschlaege({ kopf: ergebnis, zeilen, material, services: SERVICES, eigenerPreis });
}

describe("nachweisStartZeilen", () => {
  it("übernimmt Namen und Stunden und setzt für alle denselben Startsatz", () => {
    const { zeilen } = nachweisStartZeilen(ergebnis, MONTEUR.id);
    expect(zeilen.map((z) => [z.name, z.stunden, z.serviceId])).toEqual([
      ["Saygili", 40, "svc-mo"],
      ["Esref", 36, "svc-mo"],
      ["Nezih", 52, "svc-mo"],
      ["Talal", 52, "svc-mo"],
    ]);
    expect(nachweisGesamtStunden(zeilen)).toBe(180);
  });
});

describe("nachweisVorschlaege", () => {
  it("fasst alle Mitarbeiter mit gleichem Satz zu einer Summenzeile zusammen", () => {
    expect(vorschlaege(zeilenMit(["svc-mo", "svc-mo", "svc-mo", "svc-mo"]))).toEqual([
      {
        key: "svc:svc-mo",
        quelle: "stunden",
        serviceId: "svc-mo",
        descriptionDe: "Monteurstunde",
        unit: "Std.",
        amount: 180,
        unitPrice: 4800,
        additionalDescriptionDe: ZUSATZ,
      },
    ]);
  });

  it("bildet eine Position je Stundensatz in der Reihenfolge des ersten Vorkommens", () => {
    const result = vorschlaege(zeilenMit(["svc-va", "svc-mo", "svc-mo", "svc-he"]));
    expect(result.map((v) => [v.descriptionDe, v.amount])).toEqual([
      ["Vorarbeiterstunde", 40],
      ["Monteurstunde", 88],
      ["Helferstunde", 52],
    ]);
  });

  it("rechnet mit korrigierten Stunden und ignoriert leere oder gelöschte Zeilen", () => {
    const zeilen = zeilenMit(["svc-mo", "svc-mo", "svc-mo", "svc-mo"]);
    zeilen[0] = { ...zeilen[0], stunden: 38.5 };
    zeilen[1] = { ...zeilen[1], stunden: 0 };
    expect(vorschlaege(zeilen.slice(0, 3))[0].amount).toBe(90.5);
  });

  it("schreibt nie Mitarbeiternamen in Positionen", () => {
    const text = JSON.stringify(vorschlaege(zeilenMit(["svc-va", null, "svc-mo", "svc-he"])));
    for (const name of NAMEN) expect(text).not.toContain(name);
  });

  it("sammelt Mitarbeiter ohne Katalogsatz als Arbeitsstunden mit eigenem Preis", () => {
    const [monteur, ohneKatalog] = vorschlaege(
      zeilenMit(["svc-mo", null, null, "geloescht"]),
      [],
      4500,
    );
    expect(monteur.amount).toBe(40);
    expect(ohneKatalog).toMatchObject({
      key: "hours",
      serviceId: null,
      descriptionDe: "Arbeitsstunden",
      unit: "Std.",
      amount: 140,
      unitPrice: 4500,
    });
  });

  it("macht aus Material je Zeile eine Position ohne Zusatztext", () => {
    const material = [{ key: "mat:0", bezeichnung: "Kabelmörtel", anzahl: 3, einheit: "Sack", unitPrice: 1290 }];
    expect(vorschlaege([], material)).toEqual([
      {
        key: "mat:0",
        quelle: "material",
        serviceId: null,
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
    const zeilen = zeilenMit(["svc-va", null, null, null]);
    expect(nachweisImportZeilen(vorschlaege(zeilen)).vollstaendig).toBe(false);

    const result = nachweisImportZeilen(vorschlaege(zeilen, [], 4500));
    expect(result.vollstaendig).toBe(true);
    expect(result.lines).toEqual([
      { kind: "catalog", serviceId: "svc-va", amount: 40, additionalDescriptionDe: ZUSATZ },
      {
        kind: "free",
        descriptionDe: "Arbeitsstunden",
        amount: 140,
        unit: "Std.",
        unitPrice: 4500,
        additionalDescriptionDe: ZUSATZ,
      },
    ]);
  });

  it("ist ohne Positionen nicht vollständig", () => {
    expect(nachweisImportZeilen([])).toEqual({ lines: [], vollstaendig: false });
  });
});

describe("Hilfsfunktionen", () => {
  it("formatiert Zeiträume ohne Zeitzonenverschiebung", () => {
    expect(nachweisZeitraumText("2026-09-07", "2026-09-12")).toBe("07.09.–12.09.2026");
    expect(nachweisZeitraumText("2026-12-29", "2027-01-02")).toBe("29.12.2026–02.01.2027");
    expect(nachweisZeitraumText("2026-09-07", "2026-09-07")).toBe("07.09.2026");
    expect(nachweisZeitraumText(null, null)).toBe("");
  });

  it("wählt den zuletzt genutzten, sonst den ersten Stundensatz vor", () => {
    expect(nachweisStartSatz(SERVICES, HELFER.id)).toBe(HELFER.id);
    expect(nachweisStartSatz(SERVICES, "geloescht")).toBe(VORARBEITER.id);
    expect(nachweisStartSatz([PAUSCHALE], null)).toBeNull();
  });

  it("bietet nur Stundensätze an, solange es welche gibt", () => {
    expect(nachweisSatzOptionen(SERVICES)).toEqual([VORARBEITER, MONTEUR, HELFER]);
    expect(nachweisSatzOptionen([PAUSCHALE])).toEqual([PAUSCHALE]);
  });
});
