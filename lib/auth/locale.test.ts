import { describe, expect, it } from "vitest";
import { resolveAuthLocale } from "./locale";

describe("resolveAuthLocale", () => {
  it.each(["de", "tr", "ar"] as const)("akzeptiert die Locale %s", (locale) => {
    expect(resolveAuthLocale(locale)).toBe(locale);
  });

  it.each(["/evil.example", "en", "", null, undefined])(
    "fällt für %s sicher auf Deutsch zurück",
    (locale) => {
      expect(resolveAuthLocale(locale)).toBe("de");
    },
  );
});
