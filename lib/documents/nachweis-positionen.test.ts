import { describe, expect, it } from "vitest";
import type { NachweisKorrekturen } from "@/types/nachweis";
import { beispielNachweis } from "./nachweis-test-fixtures";
import { nachweisErgebnis } from "./nachweis-pruefung";
import {
  nachweisImportZeilen,
  nachweisStartSatz,
  nachweisVorschlaege,
  nachweisZeitraumText,
  type NachweisSatz,
} from "./nachweis-positionen";

const VORARBEITER: NachweisSatz = { id: "svc-va", de: "Vorarbeiterstunde", einheit: "Std.", preisCents: 5500 };
const MONTEUR: NachweisSatz = { id: "svc-mo", de: "Monteurstunde", einheit: "Std.", preisCents: 4800 };
const HELFER: NachweisSatz = { id: "svc-he", de: "Helferstunde", einheit: "Std.", preisCents: 3800 };
const PAUSCHALE: NachweisSatz = { id: "svc-pa", de: "Anfahrt", einheit: "Pauschale", preisCents: 3000 };
const SERVICES = [VORARBEITER, MONTEUR, HELFER, PAUSCHALE];
const KEINE_KORREKTUR: NachweisKorrekturen = { amounts: {}, prices: {}, excluded: [] };
const NAMEN = ["Saygili", "Esref", "Nezih", "Talal"];

const ergebnis = nachweisErgebnis(beispielNachweis());
const ZUSATZ = "lt. Stundennachweis Nr. 2026-040, 07.09.–12.09.2026, Data Center Mainz";

describe("nachweisVorschlaege", () => {
  it("fasst alle Mitarbeiter mit gleichem Satz zu einer Summenzeile zusammen", () => {
    const zuordnung = { m0: MONTEUR.id, m1: MONTEUR.id, m2: MONTEUR.id, m3: MONTEUR.id };
    expect(nachweisVorschlaege(ergebnis, zuordnung, SERVICES)).toEqual([
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
    const zuordnung = { m0: VORARBEITER.id, m1: MONTEUR.id, m2: MONTEUR.id, m3: HELFER.id };
    const vorschlaege = nachweisVorschlaege(ergebnis, zuordnung, SERVICES);
    expect(vorschlaege.map((v) => [v.descriptionDe, v.amount])).toEqual([
      ["Vorarbeiterstunde", 40],
      ["Monteurstunde", 88],
      ["Helferstunde", 52],
    ]);
  });

  it("schreibt nie Mitarbeiternamen in Positionen", () => {
    const zuordnung = { m0: VORARBEITER.id, m1: null, m2: MONTEUR.id, m3: HELFER.id };
    const text = JSON.stringify(nachweisVorschlaege(ergebnis, zuordnung, SERVICES));
    for (const name of NAMEN) expect(text).not.toContain(name);
  });

  it("sammelt Mitarbeiter ohne Katalogsatz als Arbeitsstunden ohne Preis", () => {
    const zuordnung = { m0: MONTEUR.id, m1: null, m2: null, m3: "geloescht" };
    const [monteur, ohneKatalog] = nachweisVorschlaege(ergebnis, zuordnung, SERVICES);
    expect(monteur.amount).toBe(40);
    expect(ohneKatalog).toMatchObject({
      key: "hours",
      serviceId: null,
      descriptionDe: "Arbeitsstunden",
      unit: "Std.",
      amount: 140,
      unitPrice: null,
    });
  });

  it("macht aus Material je Zeile eine Position ohne Preis und ohne Zusatztext", () => {
    const mitMaterial = {
      ...ergebnis,
      material: [{ anzahl: 3, einheit: "Sack", bezeichnung: "Kabelmörtel" }],
    };
    const vorschlaege = nachweisVorschlaege(mitMaterial, {}, SERVICES);
    expect(vorschlaege.at(-1)).toMatchObject({
      key: "mat:0",
      quelle: "material",
      descriptionDe: "Kabelmörtel",
      unit: "Sack",
      amount: 3,
      unitPrice: null,
      additionalDescriptionDe: null,
    });
  });
});

describe("nachweisImportZeilen", () => {
  const zuordnung = { m0: VORARBEITER.id, m1: null, m2: null, m3: null };
  const vorschlaege = nachweisVorschlaege(ergebnis, zuordnung, SERVICES);

  it("ist erst vollständig, wenn jede Zeile ohne Katalog einen Preis hat", () => {
    expect(nachweisImportZeilen(vorschlaege, KEINE_KORREKTUR).vollstaendig).toBe(false);
    const result = nachweisImportZeilen(vorschlaege, {
      ...KEINE_KORREKTUR,
      prices: { hours: 4500 },
    });
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

  it("übernimmt korrigierte Mengen und lässt abgewählte Zeilen weg", () => {
    const result = nachweisImportZeilen(vorschlaege, {
      amounts: { "svc:svc-va": 38.5 },
      prices: {},
      excluded: ["hours"],
    });
    expect(result).toEqual({
      lines: [
        { kind: "catalog", serviceId: "svc-va", amount: 38.5, additionalDescriptionDe: ZUSATZ },
      ],
      vollstaendig: true,
    });
  });

  it("ist ohne ausgewählte Zeile nicht vollständig", () => {
    const result = nachweisImportZeilen(vorschlaege, {
      ...KEINE_KORREKTUR,
      excluded: ["svc:svc-va", "hours"],
    });
    expect(result).toEqual({ lines: [], vollstaendig: false });
  });
});

describe("Hilfsfunktionen", () => {
  it("formatiert Zeiträume ohne Zeitzonenverschiebung", () => {
    expect(nachweisZeitraumText("2026-09-07", "2026-09-12")).toBe("07.09.–12.09.2026");
    expect(nachweisZeitraumText("2026-12-29", "2027-01-02")).toBe("29.12.2026–02.01.2027");
    expect(nachweisZeitraumText("2026-09-07", "2026-09-07")).toBe("07.09.2026");
    expect(nachweisZeitraumText(null, null)).toBe("");
  });

  it("wählt den zuletzt genutzten oder den einzigen Stundensatz vor", () => {
    expect(nachweisStartSatz(SERVICES, HELFER.id)).toBe(HELFER.id);
    expect(nachweisStartSatz(SERVICES, "geloescht")).toBeNull();
    expect(nachweisStartSatz([MONTEUR, PAUSCHALE], null)).toBe(MONTEUR.id);
    expect(nachweisStartSatz([PAUSCHALE], null)).toBeNull();
  });
});
