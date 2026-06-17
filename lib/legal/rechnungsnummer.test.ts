import { describe, expect, it } from "vitest";
import {
  formatRechnungsnummer,
  istLueckenlos,
  nextSequence,
  parseRechnungsnummer,
} from "./rechnungsnummer";

describe("formatRechnungsnummer", () => {
  it("pads the sequence to four digits", () => {
    expect(formatRechnungsnummer({ year: 2026, sequence: 1 })).toBe("2026-0001");
    expect(formatRechnungsnummer({ year: 2026, sequence: 42 })).toBe("2026-0042");
  });

  it("rejects sequences below 1", () => {
    expect(() => formatRechnungsnummer({ year: 2026, sequence: 0 })).toThrow();
  });
});

describe("parseRechnungsnummer", () => {
  it("round-trips a formatted number", () => {
    expect(parseRechnungsnummer("2026-0007")).toEqual({ year: 2026, sequence: 7 });
  });

  it("returns null for invalid input", () => {
    expect(parseRechnungsnummer("abc")).toBeNull();
  });
});

describe("nextSequence", () => {
  it("increments by exactly one (gap-free)", () => {
    expect(nextSequence(0)).toBe(1);
    expect(nextSequence(41)).toBe(42);
  });

  it("rejects negative input", () => {
    expect(() => nextSequence(-1)).toThrow();
  });
});

describe("istLueckenlos", () => {
  it("accepts a consecutive run starting at 1", () => {
    expect(istLueckenlos([1, 2, 3, 4])).toBe(true);
    expect(istLueckenlos([])).toBe(true);
  });

  it("rejects gaps or wrong start", () => {
    expect(istLueckenlos([1, 2, 4])).toBe(false);
    expect(istLueckenlos([2, 3])).toBe(false);
  });
});
