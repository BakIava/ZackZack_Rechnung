import { describe, expect, it } from "vitest";
import { faelligkeitsdatum, serviceTimingDisplay, zahlungszielText } from "./document-de";

describe("deutsche Leistungsangabe fuer Vorschau und PDF", () => {
  it("formatiert ein einzelnes Datum", () => {
    expect(serviceTimingDisplay({
      serviceDate: "2026-05-15",
      servicePeriodStart: null,
      servicePeriodEnd: null,
      servicePeriodIsMonth: false,
    })).toEqual({ label: "Leistungsdatum", value: "15.05.2026" });
  });

  it("formatiert einen Zeitraum", () => {
    expect(serviceTimingDisplay({
      serviceDate: null,
      servicePeriodStart: "2026-05-01",
      servicePeriodEnd: "2026-05-15",
      servicePeriodIsMonth: false,
    })).toEqual({
      label: "Leistungszeitraum",
      value: "01.05.2026 – 15.05.2026",
    });
  });

  it("formatiert einen Leistungsmonat mit deutschem Monatsnamen", () => {
    expect(serviceTimingDisplay({
      serviceDate: null,
      servicePeriodStart: "2026-10-01",
      servicePeriodEnd: "2026-10-31",
      servicePeriodIsMonth: true,
    })).toEqual({ label: "Leistungsmonat", value: "Oktober 2026" });
    expect(serviceTimingDisplay({
      serviceDate: null,
      servicePeriodStart: "2027-01-01",
      servicePeriodEnd: "2027-01-31",
      servicePeriodIsMonth: true,
    })).toEqual({ label: "Leistungsmonat", value: "Januar 2027" });
  });

  it("druckt einen manuell erfassten vollen Monat weiter als Zeitraum", () => {
    expect(serviceTimingDisplay({
      serviceDate: null,
      servicePeriodStart: "2026-10-01",
      servicePeriodEnd: "2026-10-31",
      servicePeriodIsMonth: false,
    })).toEqual({
      label: "Leistungszeitraum",
      value: "01.10.2026 – 31.10.2026",
    });
  });

  it("liefert ohne Angabe keine Dokumentzeile", () => {
    expect(serviceTimingDisplay({
      serviceDate: null,
      servicePeriodStart: null,
      servicePeriodEnd: null,
      servicePeriodIsMonth: false,
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
