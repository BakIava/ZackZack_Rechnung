import { describe, expect, it } from "vitest";
import {
  bewerteTextVorschlag,
  istTextImproveLaenge,
  validiereTextImproveEingabe,
  zahlenImText,
} from "./text-improve";

describe("validiereTextImproveEingabe", () => {
  it("akzeptiert getrimmte Texte innerhalb der Feldgrenzen", () => {
    expect(validiereTextImproveEingabe("  fliesen verlegn ", "bezeichnung")).toEqual({
      text: "fliesen verlegn",
      feld: "bezeichnung",
    });
    expect(validiereTextImproveEingabe("x".repeat(1000), "zusatztext")).not.toBeNull();
  });

  it.each([
    ["kein Text", 42, "bezeichnung"],
    ["zu kurz", " a ", "bezeichnung"],
    ["Bezeichnung zu lang", "x".repeat(201), "bezeichnung"],
    ["Zusatztext zu lang", "x".repeat(1001), "zusatztext"],
    ["unbekanntes Feld", "Fliesen", "notiz"],
  ])("lehnt ab: %s", (_name, text, feld) => {
    expect(validiereTextImproveEingabe(text, feld)).toBeNull();
  });

  it("teilt die Längenregel mit dem Browser", () => {
    expect(istTextImproveLaenge("ab", "bezeichnung")).toBe(true);
    expect(istTextImproveLaenge(" a", "bezeichnung")).toBe(false);
  });
});

describe("zahlenImText", () => {
  it("vergleicht Zahlen unabhängig von Schreibweise und Reihenfolge", () => {
    expect(zahlenImText("2,50 und 7")).toEqual(zahlenImText("7 sowie 2.5"));
    expect(zahlenImText("٣ Std.")).toEqual(["3"]);
  });

  it("zählt Einheiten-Hochzahlen nicht als Zahl", () => {
    expect(zahlenImText("12 m2")).toEqual(["12"]);
    expect(zahlenImText("12 m²")).toEqual(["12"]);
    expect(zahlenImText("5 M3 Beton")).toEqual(["5"]);
  });
});

describe("bewerteTextVorschlag", () => {
  const deutsch = (textDe: string) => ({ deutsch: true, textDe });

  it("liefert einen Vorschlag, wenn nur der Text besser wird", () => {
    expect(bewerteTextVorschlag("fliesen verlegn bad 12qm", deutsch("Fliesen verlegen im Bad, 12 m²"), "bezeichnung"))
      .toEqual({ status: "vorschlag", text: "Fliesen verlegen im Bad, 12 m²" });
    expect(bewerteTextVorschlag("fliesen 30x60", deutsch("Fliesen 30 × 60"), "bezeichnung"))
      .toEqual({ status: "vorschlag", text: "Fliesen 30 × 60" });
  });

  it.each([
    ["geänderte Zahl", "wand streichen 2x", "Wand streichen, 3-mal"],
    ["zusätzliche Zahl", "decke streichen", "Decke streichen, 2 Anstriche"],
    ["fehlende Zahl", "ytong 7,5 mauern", "Ytong mauern"],
  ])("verwirft den Vorschlag bei %s", (_name, eingabe, vorschlag) => {
    expect(bewerteTextVorschlag(eingabe, deutsch(vorschlag), "bezeichnung")).toEqual({ status: "fehler" });
  });

  it("meldet unverändert, wenn der Text schon korrekt ist", () => {
    expect(bewerteTextVorschlag("Fliesen verlegen", deutsch(" Fliesen verlegen "), "bezeichnung"))
      .toEqual({ status: "unveraendert" });
  });

  it("übersetzt nicht und meldet nicht deutsche Texte", () => {
    expect(bewerteTextVorschlag("banyo fayans", { deutsch: false, textDe: "banyo fayans" }, "bezeichnung"))
      .toEqual({ status: "kein_deutsch" });
  });

  it("hält Bezeichnungen einzeilig und Zusatztexte mehrzeilig", () => {
    expect(bewerteTextVorschlag("fliesen\nverlegen", deutsch("Fliesen\nverlegen im Bad"), "bezeichnung"))
      .toEqual({ status: "vorschlag", text: "Fliesen verlegen im Bad" });
    expect(bewerteTextVorschlag("inkl entsorgung\nmit abdecken", deutsch("Inkl. Entsorgung\nMit Abdecken"), "zusatztext"))
      .toEqual({ status: "vorschlag", text: "Inkl. Entsorgung\nMit Abdecken" });
  });

  it("verwirft leere oder zu lange Vorschläge", () => {
    expect(bewerteTextVorschlag("fliesen", deutsch("  "), "bezeichnung")).toEqual({ status: "fehler" });
    expect(bewerteTextVorschlag("fliesen", deutsch("F".repeat(201)), "bezeichnung")).toEqual({ status: "fehler" });
  });
});
