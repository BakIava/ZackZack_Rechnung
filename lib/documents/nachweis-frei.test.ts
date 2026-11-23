import { describe, expect, it } from "vitest";
import type { NachweisFreieExtraktion, NachweisFreieZeile } from "@/types/nachweis";
import { freieGesamtStunden, freieNachweisBereitschaft, freieStartZeilen, freiesNachweisErgebnis } from "./nachweis-frei";
import { freieKalendernotiz } from "./nachweis-frei-fixtures";

function start() {
  const original = freieKalendernotiz();
  const extraktion: NachweisFreieExtraktion = {
    variante: "frei", ausrichtung: "aufrecht", nummer: "",
    leistungen: original.leistungen, stundenLautBlatt: original.stunden_laut_blatt,
  };
  return freieStartZeilen(freiesNachweisErgebnis(extraktion));
}

function vollstaendigeZeilen() {
  return start().map((zeile) => ({
    ...zeile, amount: zeile.amount ?? 1, unit: zeile.unit ?? "Stk.", unitPrice: 4800,
  }));
}

describe("freie Nachweispositionen", () => {
  it("startet ohne Preise, behält unbekannte Werte und rechnet nur Stunden", () => {
    const zeilen = start();
    expect(zeilen.every((zeile) => zeile.unitPrice === null)).toBe(true);
    expect(zeilen[3]).toMatchObject({ amount: null, unit: null });
    expect(freieGesamtStunden(zeilen)).toBe(6.5);
    expect(freieNachweisBereitschaft("", zeilen)).toMatchObject({ vollstaendig: false, lines: [] });
  });

  it("erhält getrennte Leistungen, Material und Anfahrt bei gleichem Preis", () => {
    const result = freieNachweisBereitschaft("", vollstaendigeZeilen());
    expect(result.vollstaendig).toBe(true);
    expect(result.lines.map(({ descriptionDe, amount, unit, additionalDescriptionDe }) => [
      descriptionDe, amount, unit, additionalDescriptionDe,
    ])).toEqual([
      ["Wandöffnung schließen", 3, "Std.", "09.11.2026"],
      ["Fliesen verfugen", 2.5, "Std.", "10.11.2026"],
      ["Fugen abdichten", 1, "Std.", "13.11.2026"],
      ["Mauerstein 7,5 cm", 1, "Stk.", null],
      ["Anfahrt", 3, "Fahrt", null],
    ]);
  });

  it("listet einzelne korrigierte Tage und nur eine vorhandene Nachweisnummer", () => {
    const zeile = { ...vollstaendigeZeilen()[0], tageEingabe: "2026-11-13, 2026-11-09" };
    expect(freieNachweisBereitschaft("TEST-1", [zeile]).lines[0].additionalDescriptionDe)
      .toBe("lt. Arbeitsnachweis Nr. TEST-1, 09.11.2026, 13.11.2026");
  });

  it.each<Partial<NachweisFreieZeile>>([
    { unitPrice: null }, { unitPrice: 1.5 }, { unitPrice: 100_000_001 }, { unitPrice: Infinity },
    { amount: null }, { amount: NaN }, { amount: 0 }, { amount: 0.001 }, { amount: 100001 },
    { unit: null }, { unit: " " }, { unit: "x".repeat(31) }, { descriptionDe: "x".repeat(201) },
    { tageEingabe: "2026-11-31" },
  ])("blockiert eine fehlerhafte Zeile %j, bis sie entfernt wird", (patch) => {
    const [gut, zweite] = vollstaendigeZeilen();
    const schlecht = { ...zweite, ...patch };
    expect(freieNachweisBereitschaft("", [gut, schlecht]).lines).toEqual([]);
    expect(freieNachweisBereitschaft("", [gut]).lines).toHaveLength(1);
  });

  it("blockiert mehr als 20 Zeilen ohne abzuschneiden", () => {
    const viele = Array.from({ length: 21 }, (_, index) => ({ ...vollstaendigeZeilen()[0], key: String(index) }));
    expect(freieNachweisBereitschaft("", viele)).toMatchObject({ lines: [], limit: true, vollstaendig: false });
    viele.pop();
    expect(freieNachweisBereitschaft("", viele).lines).toHaveLength(20);
  });
});
