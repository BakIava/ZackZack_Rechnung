import { describe, expect, it } from "vitest";
import {
  NACHWEIS_AUSRICHTUNG_SCHEMA,
  NACHWEIS_EXTRACTION_SCHEMA,
  parseNachweisAusrichtungJson,
  parseNachweisExtractionJson,
} from "./nachweis-extraction-contract";

function antwort(): Record<string, unknown> {
  return {
    ausrichtung: "kopfueber",
    nachweis_nummer: "2026-040",
    projekt: "Data Center Mainz",
    tage: [{ datum: "2026-09-12", gesamt_laut_blatt: 36 }],
    mitarbeiter: [
      {
        name: "Saygili",
        eintraege: [{ datum: "2026-09-12", stunden: 0, zelle: "durchgestrichen", unsicher: true }],
      },
      {
        name: "Talal",
        eintraege: [{ datum: "2026-09-12", stunden: 12, zelle: "zahl", unsicher: false }],
      },
    ],
    gesamt_summe_laut_blatt: 180,
    material: [{ anzahl: 3, einheit: "Sack", bezeichnung: "Kabelmörtel" }],
    arbeitsleistung: " EG und 1.06 633 arbeit, Kabel mörtel 611 ",
  };
}

describe("parseNachweisExtractionJson", () => {
  it("übersetzt die Modellantwort in das interne Format", () => {
    expect(parseNachweisExtractionJson(JSON.stringify(antwort()))).toEqual({
      ausrichtung: "kopfueber",
      nummer: "2026-040",
      projekt: "Data Center Mainz",
      tage: [{ datum: "2026-09-12", gesamtLautBlatt: 36 }],
      mitarbeiter: [
        {
          name: "Saygili",
          eintraege: [
            { datum: "2026-09-12", stunden: 0, zelle: "durchgestrichen", unsicher: true },
          ],
        },
        {
          name: "Talal",
          eintraege: [{ datum: "2026-09-12", stunden: 12, zelle: "zahl", unsicher: false }],
        },
      ],
      gesamtSummeLautBlatt: 180,
      material: [{ anzahl: 3, einheit: "Sack", bezeichnung: "Kabelmörtel" }],
      arbeitsleistung: "EG und 1.06 633 arbeit, Kabel mörtel 611",
    });
  });

  it.each([
    ["kein JSON", () => "kein json"],
    ["fehlendes Feld", () => JSON.stringify({ ...antwort(), projekt: undefined })],
    ["unbekannte Ausrichtung", () => JSON.stringify({ ...antwort(), ausrichtung: "schief" })],
    [
      "unbekannter Zellstatus",
      () => {
        const value = antwort();
        (value.mitarbeiter as { eintraege: { zelle: string }[] }[])[1].eintraege[0].zelle = "fast";
        return JSON.stringify(value);
      },
    ],
    [
      "mehr als 24 Stunden in einer Zelle",
      () => {
        const value = antwort();
        (value.mitarbeiter as { eintraege: { stunden: number }[] }[])[1].eintraege[0].stunden = 25;
        return JSON.stringify(value);
      },
    ],
    ["negative Gesamtsumme", () => JSON.stringify({ ...antwort(), gesamt_summe_laut_blatt: -1 })],
    ["zu viele Mitarbeiter", () =>
      JSON.stringify({
        ...antwort(),
        mitarbeiter: Array.from({ length: 51 }, () => ({ name: "A", eintraege: [] })),
      }),
    ],
  ])("verwirft %s", (_label, build) => {
    expect(parseNachweisExtractionJson(build())).toBeNull();
  });

  it("verlangt im Schema jedes Feld und keine zusätzlichen", () => {
    for (const schema of [NACHWEIS_EXTRACTION_SCHEMA, NACHWEIS_AUSRICHTUNG_SCHEMA]) {
      expect(schema.additionalProperties).toBe(false);
      expect([...schema.required].sort()).toEqual(Object.keys(schema.properties).sort());
    }
  });
});

describe("parseNachweisAusrichtungJson", () => {
  it("liest die gemeldete Ausrichtung", () => {
    expect(parseNachweisAusrichtungJson('{"ausrichtung":"kopf_links"}')).toBe("kopf_links");
  });

  it.each(["kein json", "[]", '{"ausrichtung":"schief"}', "{}"])("verwirft %s", (raw) => {
    expect(parseNachweisAusrichtungJson(raw)).toBeNull();
  });
});
