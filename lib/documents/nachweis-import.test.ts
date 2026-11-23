import { describe, expect, it } from "vitest";
import { MAX_NACHWEIS_IMPORT_LINES, parseNachweisImportLines } from "./nachweis-import";

const freeLine = {
  kind: "free",
  descriptionDe: "  633 636 611 Arbeit EG/1.OG ",
  amount: 12.345,
  unit: "Std.",
  unitPrice: 4500,
  additionalDescriptionDe: "",
};

describe("parseNachweisImportLines", () => {
  it("akzeptiert freie Zeilen und normalisiert sie", () => {
    expect(parseNachweisImportLines([freeLine])).toEqual([
      {
        kind: "free",
        descriptionDe: "633 636 611 Arbeit EG/1.OG",
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
    ["zu viele Zeilen", Array.from({ length: MAX_NACHWEIS_IMPORT_LINES + 1 }, () => freeLine)],
    ["Menge über Limit vor Rundung", [{ ...freeLine, amount: 100000.001 }]],
    ["Menge NaN", [{ ...freeLine, amount: NaN }]],
    ["Menge Infinity", [{ ...freeLine, amount: Infinity }]],
    ["Einheit fehlt", [{ ...freeLine, unit: " " }]],
    ["Einheit zu lang", [{ ...freeLine, unit: "x".repeat(31) }]],
    ["Zusatz zu lang", [{ ...freeLine, additionalDescriptionDe: "x".repeat(501) }]],
    ["Preis über Limit", [{ ...freeLine, unitPrice: 100_000_001 }]],
    ["Menge 0", [{ ...freeLine, amount: 0 }]],
    ["negative Menge", [{ ...freeLine, amount: -1 }]],
    ["Preis in Euro statt Cents", [{ ...freeLine, unitPrice: 45.5 }]],
    ["Preis 0", [{ ...freeLine, unitPrice: 0 }]],
    ["Abzug", [{ ...freeLine, unitPrice: -4500 }]],
    ["leere Bezeichnung", [{ ...freeLine, descriptionDe: "  " }]],
    ["zu lange Bezeichnung", [{ ...freeLine, descriptionDe: "x".repeat(201) }]],
    ["Katalogzeile", [{ kind: "catalog", serviceId: "svc", amount: 1, additionalDescriptionDe: null }]],
  ])("verwirft %s", (_label, input) => {
    expect(parseNachweisImportLines(input)).toBeNull();
  });
});
