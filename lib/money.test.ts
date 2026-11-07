import { describe, expect, it } from "vitest";
import { eurosToCents, roundHalfAwayFromZero } from "./money";

describe("roundHalfAwayFromZero", () => {
  it("rundet ,5 vom Nullpunkt weg – wie Postgres round(numeric)", () => {
    expect(roundHalfAwayFromZero(2.5)).toBe(3);
    expect(roundHalfAwayFromZero(-2.5)).toBe(-3);
    expect(roundHalfAwayFromZero(-199.5)).toBe(-200);
    expect(roundHalfAwayFromZero(199.5)).toBe(200);
  });

  it("rundet alles andere zur nächsten ganzen Zahl", () => {
    expect(roundHalfAwayFromZero(2.4)).toBe(2);
    expect(roundHalfAwayFromZero(-2.4)).toBe(-2);
    expect(roundHalfAwayFromZero(-2.6)).toBe(-3);
  });

  it("liefert nie −0", () => {
    expect(Object.is(roundHalfAwayFromZero(-0.4), 0)).toBe(true);
    expect(Object.is(roundHalfAwayFromZero(-0), 0)).toBe(true);
  });
});

describe("eurosToCents", () => {
  it("wandelt auch Abzüge in ganzzahlige Cents", () => {
    expect(eurosToCents(12.35)).toBe(1_235);
    expect(eurosToCents(-12.35)).toBe(-1_235);
    expect(eurosToCents(-2000)).toBe(-200_000);
  });
});
