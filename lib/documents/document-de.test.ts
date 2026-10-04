import { describe, expect, it } from "vitest";
import { faelligkeitsdatum, serviceTimingDisplay, zahlungszielText } from "./document-de";

describe("deutsche Leistungsangabe fuer Vorschau und PDF", () => {
  it("formatiert ein einzelnes Datum", () => {
    expect(serviceTimingDisplay({
      serviceDate: "2026-05-15",
      servicePeriodStart: null,
      servicePeriodEnd: null,
    })).toEqual({ label: "Leistungsdatum", value: "15.05.2026" });
  });

  it("formatiert einen Zeitraum", () => {
    expect(serviceTimingDisplay({
      serviceDate: null,
      servicePeriodStart: "2026-05-01",
      servicePeriodEnd: "2026-05-15",
    })).toEqual({
      label: "Leistungszeitraum",
      value: "01.05.2026 – 15.05.2026",
    });
  });

  it("liefert ohne Angabe keine Dokumentzeile", () => {
    expect(serviceTimingDisplay({
      serviceDate: null,
      servicePeriodStart: null,
      servicePeriodEnd: null,
    })).toBeNull();
  });
});

describe("Zahlungsziel und Fälligkeit", () => {
  it("berechnet die Fälligkeit als Ausstellungsdatum plus Zahlungsziel", () => {
    expect(faelligkeitsdatum("2026-06-09", 14)).toBe("2026-06-23");
    expect(faelligkeitsdatum("2026-12-20", 14)).toBe("2027-01-03");
  });

  it("nennt im Zahlungszieltext genau dieses Fälligkeitsdatum", () => {
    expect(zahlungszielText("2026-06-09", 14)).toBe(
      "Zahlbar innerhalb von 14 Tagen (bis 23.06.2026) ohne Abzug auf das unten genannte Konto.",
    );
  });
});
