import { describe, expect, it } from "vitest";
import {
  istFinalisierbar,
  offeneMaengel,
  pruefeDokumentPflicht,
  type DokumentPflichtInput,
} from "./dokumentPflicht";

const vollstaendig: DokumentPflichtInput = {
  companyName: "Yılmaz Malerbetrieb",
  companyStreet: "Neckarstraße 45",
  companyPostcode: "70190",
  companyCity: "Stuttgart",
  companySteuernummer: "26/123/45678",
  companyUstId: null,
  customerName: "Familie Schneider",
  issueDate: "2026-06-06",
  itemCount: 2,
};

describe("pruefeDokumentPflicht", () => {
  it("ist finalisierbar, wenn alle Pflichtangaben vorhanden sind", () => {
    expect(istFinalisierbar(pruefeDokumentPflicht(vollstaendig))).toBe(true);
    expect(offeneMaengel(pruefeDokumentPflicht(vollstaendig))).toHaveLength(0);
  });

  it("akzeptiert USt-IdNr. als Ersatz für die Steuernummer", () => {
    const checks = pruefeDokumentPflicht({
      ...vollstaendig,
      companySteuernummer: null,
      companyUstId: "DE123456789",
    });
    expect(istFinalisierbar(checks)).toBe(true);
  });

  it("blockiert, wenn weder Steuernummer noch USt-IdNr. gesetzt sind", () => {
    const checks = pruefeDokumentPflicht({
      ...vollstaendig,
      companySteuernummer: "   ",
      companyUstId: null,
    });
    expect(istFinalisierbar(checks)).toBe(false);
    expect(offeneMaengel(checks).map((c) => c.feld)).toContain("companySteuer");
  });

  it("meldet unvollständige Firmenadresse an den Einstellungen", () => {
    const checks = pruefeDokumentPflicht({ ...vollstaendig, companyCity: "" });
    const mangel = offeneMaengel(checks).find((c) => c.feld === "companyAddress");
    expect(mangel?.location).toBe("settings");
    expect(istFinalisierbar(checks)).toBe(false);
  });

  it("blockiert ohne Kundenname (Verweis auf Kunde)", () => {
    const checks = pruefeDokumentPflicht({ ...vollstaendig, customerName: null });
    const mangel = offeneMaengel(checks).find((c) => c.feld === "customerName");
    expect(mangel?.location).toBe("customer");
  });

  it("blockiert ohne Position (Verweis auf Positionen)", () => {
    const checks = pruefeDokumentPflicht({ ...vollstaendig, itemCount: 0 });
    const mangel = offeneMaengel(checks).find((c) => c.feld === "positions");
    expect(mangel?.location).toBe("positions");
    expect(istFinalisierbar(checks)).toBe(false);
  });

  it("blockiert ohne Rechnungsdatum", () => {
    const checks = pruefeDokumentPflicht({ ...vollstaendig, issueDate: null });
    expect(istFinalisierbar(checks)).toBe(false);
    expect(offeneMaengel(checks).map((c) => c.feld)).toContain("issueDate");
  });
});
