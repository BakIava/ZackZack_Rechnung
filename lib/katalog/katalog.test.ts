import { describe, expect, it } from "vitest";
import { anzeigeName, dokumentName } from "./types";
import { sampleKatalog } from "./sample";

const eintrag = sampleKatalog[0];

describe("Katalog UI vs. document language", () => {
  it("shows the operating language in the UI", () => {
    expect(anzeigeName(eintrag, "tr")).toBe("Duvar boyama");
    expect(anzeigeName(eintrag, "ar")).toBe("طلاء الجدران");
  });

  it("ALWAYS uses the German term on the document, regardless of UI locale", () => {
    expect(dokumentName(eintrag)).toBe("Malerarbeiten Wandfläche");
    expect(dokumentName(eintrag)).toBe(eintrag.de);
  });
});
