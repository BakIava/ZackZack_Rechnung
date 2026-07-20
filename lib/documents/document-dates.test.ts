import { describe, expect, it } from "vitest";
import {
  addOneCalendarMonth,
  isPastDate,
  isValidQuoteDateRange,
  todayInGermany,
} from "./document-dates";

describe("Angebotsdaten", () => {
  it("addiert einen Kalendermonat und klemmt ans Monatsende", () => {
    expect(addOneCalendarMonth("2026-01-31")).toBe("2026-02-28");
    expect(addOneCalendarMonth("2028-01-31")).toBe("2028-02-29");
    expect(addOneCalendarMonth("2026-12-31")).toBe("2027-01-31");
  });

  it("ermittelt das deutsche Datum auch an einer UTC-Tagesgrenze", () => {
    expect(todayInGermany(new Date("2026-07-20T22:30:00.000Z"))).toBe("2026-07-21");
  });

  it("akzeptiert vergangene Gueltigkeit, aber nie vor dem Angebotsdatum", () => {
    expect(isValidQuoteDateRange("2026-07-20", "2026-07-20")).toBe(true);
    expect(isValidQuoteDateRange("2026-07-20", "2026-07-19")).toBe(false);
    expect(isPastDate("2026-07-19", "2026-07-20")).toBe(true);
  });

  it("weist ungueltige ISO-Daten zurueck", () => {
    expect(() => addOneCalendarMonth("2026-02-30")).toThrow("invalid_iso_date");
    expect(isValidQuoteDateRange("2026-07-20", "20.07.2026")).toBe(false);
  });
});
