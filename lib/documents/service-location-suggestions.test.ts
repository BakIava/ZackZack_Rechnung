import { describe, expect, it } from "vitest";
import type { DocumentServiceLocation } from "@/types/service-location";
import { serviceLocationKey, uniqueServiceLocations } from "./service-location-suggestions";

function ort(name: string, street = "Gartenstraße", city = "Mainz"): DocumentServiceLocation {
  return { name, street, houseNumber: "12", postcode: "55116", city, addressExtra: "" };
}

describe("uniqueServiceLocations", () => {
  it("behält die Reihenfolge (neueste zuerst) und entfernt doppelte Orte", () => {
    const result = uniqueServiceLocations([
      ort("Baustelle Schneider"),
      ort("Data Center", "Robert-Bosch-Straße"),
      ort("  baustelle   SCHNEIDER "),
    ]);
    expect(result.map((entry) => entry.name)).toEqual(["Baustelle Schneider", "Data Center"]);
  });

  it("liefert höchstens fünf Vorschläge", () => {
    const orte = Array.from({ length: 8 }, (_, index) => ort(`Ort ${index}`));
    expect(uniqueServiceLocations(orte)).toHaveLength(5);
  });

  it("unterscheidet Orte mit gleicher Bezeichnung, aber anderer Adresse", () => {
    expect(serviceLocationKey(ort("Halle", "A-Str."))).not.toBe(serviceLocationKey(ort("Halle", "B-Str.")));
  });

  it("ignoriert den Adresszusatz beim Vergleich", () => {
    expect(serviceLocationKey({ ...ort("Halle"), addressExtra: "2. OG" })).toBe(serviceLocationKey(ort("Halle")));
  });
});
