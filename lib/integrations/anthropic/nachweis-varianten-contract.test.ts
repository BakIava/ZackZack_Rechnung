import { describe, expect, it } from "vitest";
import { freieAbrechnung, freieKalendernotiz, freieLeistung } from "@/lib/documents/nachweis-frei-fixtures";
import { parseNachweisVariantenJson } from "./nachweis-varianten-contract";

const parse = (nachweis: unknown) => parseNachweisVariantenJson(JSON.stringify({ nachweis }));

describe("Variantenparser", () => {
  it("erhält Stunden, einzelne Tage, Maße im Text und Quellenunsicherheit", () => {
    const notiz = freieKalendernotiz();
    expect(parse(notiz)).toEqual({
      variante: "frei",
      ausrichtung: "aufrecht",
      nummer: "",
      stundenLautBlatt: 6.5,
      leistungen: notiz.leistungen,
    });
  });

  it("liest mengenbasierte Positionen und explizite Pauschalen ohne Stundensumme", () => {
    const abrechnung = freieAbrechnung();
    expect(parse(abrechnung)).toMatchObject({ leistungen: abrechnung.leistungen, stundenLautBlatt: null });
  });

  it("erhält leere Leistungsliste bei reiner Gesamtsumme für die fachliche Ablehnung", () => {
    expect(parse({ ...freieKalendernotiz(), leistungen: [] })).toMatchObject({ leistungen: [], stundenLautBlatt: 6.5 });
  });

  it.each([
    { tage: ["2026-02-29"] },
    { amount: 0 },
    { amount: -1 },
    { amount: 100001 },
    { amount: "2,5" },
    { unit: "" },
    { unit: "x".repeat(31) },
    { descriptionDe: "x".repeat(201) },
    { unsicher: ["tage", "tage"] },
    { unsicher: ["preis"] },
    { unitPrice: 3000 },
    { status: "durchgestrichen" },
    { amount: 2, unit: "Pauschale" },
  ])("verwirft eine Zeile mit %j", (patch) => {
    expect(parse({ ...freieKalendernotiz(), leistungen: [{ ...freieLeistung(), ...patch }] })).toBeNull();
  });

  it("verwirft kaputte Antworten und unbekannte Varianten", () => {
    expect(parseNachweisVariantenJson("{")).toBeNull();
    expect(parse({ ...freieKalendernotiz(), variante: "andere" })).toBeNull();
    expect(parse({ ...freieKalendernotiz(), kunde: "SYNTHETISCHER AUFTRAGGEBER" })).toBeNull();
    expect(parse({ ...freieKalendernotiz(), leistungen: undefined })).toBeNull();
  });
});
