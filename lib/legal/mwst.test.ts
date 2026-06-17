import { describe, expect, it } from "vitest";
import { berechneSteuer, braucht19Hinweis } from "./mwst";

describe("braucht19Hinweis", () => {
  it("requires the §19 note exactly when no MwSt is shown", () => {
    expect(braucht19Hinweis(false)).toBe(true);
    expect(braucht19Hinweis(true)).toBe(false);
  });
});

describe("berechneSteuer", () => {
  it("shows no tax for §19 (Kleinunternehmer) – brutto equals netto", () => {
    const result = berechneSteuer([{ nettoCents: 50000, satz: 0 }], false);
    expect(result.ausgewiesen).toBe(false);
    expect(result.steuerCents).toBe(0);
    expect(result.bruttoCents).toBe(50000);
  });

  it("breaks down 19 % and 7 % when MwSt is active", () => {
    const result = berechneSteuer(
      [
        { nettoCents: 10000, satz: 19 },
        { nettoCents: 10000, satz: 7 },
      ],
      true,
    );
    expect(result.ausgewiesen).toBe(true);
    expect(result.nettoCents).toBe(20000);
    expect(result.steuerCents).toBe(1900 + 700);
    expect(result.bruttoCents).toBe(20000 + 2600);
  });
});
