import { describe, expect, it } from "vitest";
import {
  istExportierbar,
  pruefePflichtangaben,
  type PflichtangabenInput,
} from "./pflichtangaben";

const vollstaendig: PflichtangabenInput = {
  ausstellerName: "Yılmaz Malerbetrieb",
  empfaengerName: "Familie Schneider",
  steuernummer: "12/345/67890",
  datum: "09.06.2026",
  hatLeistung: true,
  betragCents: 57500,
  rechnungsnummer: "2026-0001",
  mwstAusgewiesen: false,
  kleinunternehmerHinweisGesetzt: true,
};

describe("pruefePflichtangaben", () => {
  it("is exportable when everything incl. §19 note is set", () => {
    expect(istExportierbar(pruefePflichtangaben(vollstaendig))).toBe(true);
  });

  it("includes the §19 note item only when no MwSt is shown", () => {
    const ohneMwst = pruefePflichtangaben(vollstaendig).map((i) => i.key);
    expect(ohneMwst).toContain("kleinunternehmer");

    const mitMwst = pruefePflichtangaben({
      ...vollstaendig,
      mwstAusgewiesen: true,
    }).map((i) => i.key);
    expect(mitMwst).not.toContain("kleinunternehmer");
  });

  it("blocks export when the invoice number is missing (not yet finalised)", () => {
    const items = pruefePflichtangaben({
      ...vollstaendig,
      rechnungsnummer: null,
    });
    expect(istExportierbar(items)).toBe(false);
  });
});
