import { describe, expect, it } from "vitest";
import { EMPTY_CUSTOMER_INTAKE } from "@/lib/customers/customer-intake";
import {
  buildMapboxStructuredParams,
  parseMapboxAddressResponse,
} from "./address-geocoder-mapper";

function feature(id: string) {
  return {
    id,
    properties: {
      mapbox_id: id,
      feature_type: "address",
      name: "11a Robert-Bosch-Straße",
      full_address: "Robert-Bosch-Straße 11a, 55129 Mainz, Deutschland",
      context: {
        address: {
          address_number: "11a",
          street_name: "Robert-Bosch-Straße",
        },
        postcode: { name: "55129" },
        place: { name: "Mainz" },
      },
    },
  };
}

describe("Mapbox structured address mapping", () => {
  it("baut ausschließlich eine strukturierte Deutschland-Suche", () => {
    const params = buildMapboxStructuredParams(
      {
        ...EMPTY_CUSTOMER_INTAKE,
        street: "Robert-Bosch-Straße",
        street_no: "11a",
        postcode: "55129",
        city: "Mainz",
      },
      "token",
    );

    expect(params.get("q")).toBeNull();
    expect(params.get("street")).toBe("Robert-Bosch-Straße");
    expect(params.get("address_number")).toBe("11a");
    expect(params.get("postcode")).toBe("55129");
    expect(params.get("place")).toBe("Mainz");
    expect(params.get("country")).toBe("de");
    expect(params.get("autocomplete")).toBe("false");
    expect(params.get("limit")).toBe("3");
  });

  it("lässt eine fehlende Hausnummer weg", () => {
    const params = buildMapboxStructuredParams(
      {
        street: "Hauptstraße",
        street_no: null,
        postcode: null,
        city: "Mainz",
      },
      "token",
    );
    expect(params.has("address_number")).toBe(false);
  });

  it("normalisiert höchstens die ersten drei gültigen Treffer", () => {
    const candidates = parseMapboxAddressResponse({
      features: [feature("1"), feature("2"), feature("3"), feature("4")],
    });
    expect(candidates).toHaveLength(3);
    expect(candidates[0]).toEqual({
      id: "1",
      street: "Robert-Bosch-Straße",
      street_no: "11a",
      postcode: "55129",
      city: "Mainz",
      formatted_address:
        "Robert-Bosch-Straße 11a, 55129 Mainz, Deutschland",
    });
  });

  it("ignoriert unvollständige oder fachfremde Features defensiv", () => {
    expect(
      parseMapboxAddressResponse({
        features: [
          { properties: { feature_type: "place", name: "Mainz" } },
          { properties: { feature_type: "address", name: "Ohne Kontext" } },
        ],
      }),
    ).toEqual([]);
    expect(parseMapboxAddressResponse(null)).toEqual([]);
  });
});
