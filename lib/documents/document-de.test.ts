import { describe, expect, it } from "vitest";
import { serviceTimingDisplay } from "./document-de";

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
