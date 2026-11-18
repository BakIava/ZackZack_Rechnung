import { describe, expect, it } from "vitest";
import { MAX_NACHWEIS_IMPORT_LINES, parseNachweisImportLines } from "./nachweis-import";

const catalogLine = {
  kind: "catalog",
  serviceId: "svc-mo",
  amount: 180,
  additionalDescriptionDe: "lt. Stundennachweis Nr. 2026-040",
};
const freeLine = {
  kind: "free",
  descriptionDe: "  Arbeitsstunden ",
  amount: 12.345,
  unit: "Std.",
  unitPrice: 4500,
  additionalDescriptionDe: "",
};

describe("parseNachweisImportLines", () => {
  it("akzeptiert Katalog- und freie Zeilen und normalisiert sie", () => {
    expect(parseNachweisImportLines([catalogLine, freeLine])).toEqual([
      catalogLine,
      {
        kind: "free",
        descriptionDe: "Arbeitsstunden",
        amount: 12.35,
        unit: "Std.",
        unitPrice: 4500,
        additionalDescriptionDe: null,
      },
    ]);
  });

  it.each([
    ["keine Liste", "x"],
    ["leere Liste", []],
    ["zu viele Zeilen", Array.from({ length: MAX_NACHWEIS_IMPORT_LINES + 1 }, () => catalogLine)],
    ["Menge 0", [{ ...catalogLine, amount: 0 }]],
    ["negative Menge", [{ ...catalogLine, amount: -1 }]],
    ["fehlende Service-ID", [{ ...catalogLine, serviceId: "" }]],
    ["Preis in Euro statt Cents", [{ ...freeLine, unitPrice: 45.5 }]],
    ["Preis 0", [{ ...freeLine, unitPrice: 0 }]],
    ["Abzug", [{ ...freeLine, unitPrice: -4500 }]],
    ["leere Bezeichnung", [{ ...freeLine, descriptionDe: "  " }]],
    ["unbekannte Art", [{ ...catalogLine, kind: "fremd" }]],
  ])("verwirft %s", (_label, input) => {
    expect(parseNachweisImportLines(input)).toBeNull();
  });
});
