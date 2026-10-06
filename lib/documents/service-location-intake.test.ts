import { describe, expect, it } from "vitest";
import {
  EMPTY_SERVICE_LOCATION_EXTRACTION,
  hasUsableServiceLocation,
  parseServiceLocationExtraction,
  parseServiceLocationExtractionJson,
  validateServiceLocationText,
} from "./service-location-intake";

describe("service location intake", () => {
  it("erlaubt nur einen nicht leeren Text bis 1200 Zeichen", () => {
    expect(validateServiceLocationText("  Baustelle Mainz  ")).toBe("Baustelle Mainz");
    expect(validateServiceLocationText("x".repeat(1200))).toHaveLength(1200);
    expect(validateServiceLocationText("x".repeat(1201))).toBeNull();
    expect(validateServiceLocationText("  ")).toBeNull();
    expect(validateServiceLocationText({ text: "Baustelle" })).toBeNull();
  });

  it("übernimmt nur zulässige erkannte Felder und erhält gültige Teilangaben", () => {
    expect(parseServiceLocationExtraction({
      name: "  Baustelle Familie Schneider ",
      street: " Gartenstraße ",
      houseNumber: 12,
      postcode: "x".repeat(21),
      city: "Mainz",
      addressExtra: "Hinterhaus",
      customerEmail: "secret@example.com",
    })).toEqual({
      name: "Baustelle Familie Schneider",
      street: "Gartenstraße",
      houseNumber: null,
      postcode: null,
      city: "Mainz",
      addressExtra: "Hinterhaus",
    });
  });

  it("lehnt kaputtes JSON ab und verlangt eine Bezeichnung, Straße oder Stadt", () => {
    expect(parseServiceLocationExtractionJson("kein json")).toBeNull();
    expect(parseServiceLocationExtraction([])).toBeNull();
    expect(hasUsableServiceLocation(EMPTY_SERVICE_LOCATION_EXTRACTION)).toBe(false);
    expect(hasUsableServiceLocation({ ...EMPTY_SERVICE_LOCATION_EXTRACTION, postcode: "55116" })).toBe(false);
    expect(hasUsableServiceLocation({ ...EMPTY_SERVICE_LOCATION_EXTRACTION, city: "Mainz" })).toBe(true);
  });
});
