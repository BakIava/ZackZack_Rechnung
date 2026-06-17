import { describe, expect, it } from "vitest";
import { berechneVerkaufspreis } from "./marge";

describe("berechneVerkaufspreis", () => {
  it("applies a percentage markup", () => {
    expect(
      berechneVerkaufspreis(10000, { typ: "prozent", wert: 20 }),
    ).toBe(12000);
  });

  it("applies a fixed euro markup (in cents)", () => {
    expect(berechneVerkaufspreis(10000, { typ: "euro", cents: 2500 })).toBe(
      12500,
    );
  });

  it("rejects negative purchase prices", () => {
    expect(() =>
      berechneVerkaufspreis(-1, { typ: "prozent", wert: 10 }),
    ).toThrow();
  });
});
