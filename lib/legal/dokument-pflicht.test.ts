import { describe, expect, it } from "vitest";
import {
  istFinalisierbar,
  KLEINBETRAG_LIMIT_CENTS,
  offeneMaengel,
  pruefeDokumentPflicht,
  type DokumentPflichtInput,
} from "./dokument-pflicht";

// Vollständige, große Rechnung (> 250 €): Empfängerangaben sind Pflicht.
const grossVollstaendig: DokumentPflichtInput = {
  companyName: "Yılmaz Malerbetrieb",
  companyStreet: "Neckarstraße",
  companyPostcode: "70190",
  companyCity: "Stuttgart",
  companySteuernummer: "26/123/45678",
  companyUstId: null,
  issueDate: "2026-06-06",
  itemCount: 2,
  totalAmountCents: 90_000,
  customerName: "Familie Schneider",
  customerStreet: "Hauptstraße",
  customerStreetNo: "12",
  customerPostcode: "55411",
  customerCity: "Bingen",
};

describe("pruefeDokumentPflicht – Firma & Dokument", () => {
  it("ist finalisierbar, wenn alle Pflichtangaben vorhanden sind", () => {
    expect(istFinalisierbar(pruefeDokumentPflicht(grossVollstaendig))).toBe(true);
    expect(offeneMaengel(pruefeDokumentPflicht(grossVollstaendig))).toHaveLength(0);
  });

  it("akzeptiert USt-IdNr. als Ersatz für die Steuernummer", () => {
    const checks = pruefeDokumentPflicht({
      ...grossVollstaendig,
      companySteuernummer: null,
      companyUstId: "DE123456789",
    });
    expect(istFinalisierbar(checks)).toBe(true);
  });

  it("blockiert bei unvollständiger Firmenadresse", () => {
    const checks = pruefeDokumentPflicht({ ...grossVollstaendig, companyCity: "" });
    const mangel = offeneMaengel(checks).find((c) => c.feld === "companyAddress");
    expect(mangel?.location).toBe("settings");
  });

  it("blockiert ohne Position und ohne Rechnungsdatum", () => {
    const checks = pruefeDokumentPflicht({
      ...grossVollstaendig,
      itemCount: 0,
      issueDate: null,
    });
    const felder = offeneMaengel(checks).map((c) => c.feld);
    expect(felder).toContain("positions");
    expect(felder).toContain("issueDate");
  });
});

describe("pruefeDokumentPflicht – betragsabhängige Empfängerangaben", () => {
  it("verlangt oberhalb der Grenze Name UND Anschrift des Empfängers", () => {
    const ohneKunde = pruefeDokumentPflicht({
      ...grossVollstaendig,
      customerName: null,
      customerStreet: null,
      customerStreetNo: null,
      customerPostcode: null,
      customerCity: null,
    });
    const felder = offeneMaengel(ohneKunde).map((c) => c.feld);
    expect(felder).toContain("customerName");
    expect(felder).toContain("customerAddress");
    expect(istFinalisierbar(ohneKunde)).toBe(false);
  });

  it("blockiert bei unvollständiger Empfängeranschrift (fehlende Hausnummer)", () => {
    const checks = pruefeDokumentPflicht({ ...grossVollstaendig, customerStreetNo: "" });
    expect(offeneMaengel(checks).map((c) => c.feld)).toContain("customerAddress");
  });

  it("Kleinbetragsrechnung (≤ 250 €) braucht keinen Empfänger", () => {
    const klein = pruefeDokumentPflicht({
      ...grossVollstaendig,
      totalAmountCents: KLEINBETRAG_LIMIT_CENTS, // exakt 250 € → noch Kleinbetrag
      customerName: null,
      customerStreet: null,
      customerStreetNo: null,
      customerPostcode: null,
      customerCity: null,
    });
    const felder = klein.map((c) => c.feld);
    expect(felder).not.toContain("customerName");
    expect(felder).not.toContain("customerAddress");
    expect(istFinalisierbar(klein)).toBe(true);
  });

  it("genau über der Grenze (250,01 €) wird der Empfänger wieder Pflicht", () => {
    const knapp = pruefeDokumentPflicht({
      ...grossVollstaendig,
      totalAmountCents: KLEINBETRAG_LIMIT_CENTS + 1,
      customerName: null,
      customerStreet: null,
      customerStreetNo: null,
      customerPostcode: null,
      customerCity: null,
    });
    expect(istFinalisierbar(knapp)).toBe(false);
  });
});
