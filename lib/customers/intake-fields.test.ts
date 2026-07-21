import { describe, expect, it } from "vitest";
import { mapIntakeResult } from "./intake-fields";
import type { CustomerIntakeResult } from "@/types/customer-intake";

describe("mapIntakeResult – Intake-Ergebnis → Formular", () => {
  it("address_matches: behält die erkannte Adresse bei", () => {
    const result: CustomerIntakeResult = {
      status: "address_matches",
      customer: {
        customer_type: "private",
        firstname: "Familie",
        lastname: "Schneider",
        company_name: null,
        street: "berger str",
        street_no: "147",
        postcode: "60385",
        city: "frankfurt",
        phone: "069 123456",
        email: null,
      },
      addresses: [
        {
          id: "a1",
          street: "Berger Straße",
          street_no: "147",
          postcode: "60385",
          city: "Frankfurt am Main",
          formatted_address: "Berger Straße 147, 60385 Frankfurt am Main",
        },
      ],
    };
    const m = mapIntakeResult(result);
    expect(m.recognized).toBe(true);
    expect(m.values.street).toBe("berger str");
    expect(m.values.city).toBe("frankfurt");
  });

  it("manual mit Teildaten: übernimmt alle sicheren Felder", () => {
    const result: CustomerIntakeResult = {
      status: "manual",
      reason: "no_matches",
      customer: {
        customer_type: "business",
        firstname: null,
        lastname: null,
        company_name: "Müller GmbH",
        street: null,
        street_no: null,
        postcode: null,
        city: null,
        phone: "069 887654",
        email: "kontakt@mueller-gmbh.de",
      },
    };
    const m = mapIntakeResult(result);
    expect(m.recognized).toBe(true);
    expect(m.values.customerType).toBe("business");
    expect(m.values.companyName).toBe("Müller GmbH");
    expect(m.values.email).toBe("kontakt@mueller-gmbh.de");
  });

  it("ergänzt nur fehlende Adressfelder aus Mapbox", () => {
    const result: CustomerIntakeResult = {
      status: "address_matches",
      customer: {
        customer_type: "private",
        firstname: "Max",
        lastname: "Mustermann",
        company_name: null,
        street: "Hauptstraße",
        street_no: null,
        postcode: null,
        city: "Mainz",
        phone: null,
        email: null,
      },
      addresses: [
        {
          id: "a1",
          street: "Hauptstraße",
          street_no: "11a",
          postcode: "55116",
          city: "Mainz",
          formatted_address: "Hauptstraße 11a, 55116 Mainz",
        },
      ],
    };

    const mapped = mapIntakeResult(result);
    expect(mapped.values.street).toBe("Hauptstraße");
    expect(mapped.values.houseNo).toBe("11a");
    expect(mapped.values.zip).toBe("55116");
    expect(mapped.values.city).toBe("Mainz");
  });

  it("behält Ort, PLZ und Hausnummer bei einem abweichenden Mapbox-Treffer", () => {
    const result: CustomerIntakeResult = {
      status: "address_matches",
      customer: {
        customer_type: "business",
        firstname: null,
        lastname: null,
        company_name: "Müller GmbH",
        street: "Industriestr",
        street_no: "8",
        postcode: "63065",
        city: "Offenbach",
        phone: "069 887654",
        email: "kontakt@mueller-gmbh.de",
      },
      addresses: [
        {
          id: "a1",
          street: "Industriestraße",
          street_no: "8",
          postcode: "63165",
          city: "Mühlheim am Main",
          formatted_address: "Industriestraße 8, 63165 Mühlheim am Main",
        },
      ],
    };

    const mapped = mapIntakeResult(result);
    expect(mapped.values.street).toBe("Industriestr");
    expect(mapped.values.houseNo).toBe("8");
    expect(mapped.values.zip).toBe("63065");
    expect(mapped.values.city).toBe("Offenbach");
  });

  it("manual ohne Daten → nichts erkannt", () => {
    const result: CustomerIntakeResult = {
      status: "manual",
      reason: "extraction_failed",
      customer: {
        customer_type: null,
        firstname: null,
        lastname: null,
        company_name: null,
        street: null,
        street_no: null,
        postcode: null,
        city: null,
        phone: null,
        email: null,
      },
    };
    const m = mapIntakeResult(result);
    expect(m.recognized).toBe(false);
    expect(m.values.customerType).toBeNull();
  });
});
