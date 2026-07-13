import { describe, expect, it } from "vitest";
import { mapIntakeResult } from "./intake-fields";
import type { CustomerIntakeResult } from "@/types/customer-intake";

describe("mapIntakeResult – Intake-Ergebnis → Formular/Badges", () => {
  it("address_matches: übernimmt Geocoding-Treffer und markiert Korrekturen", () => {
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
    expect(m.values.street).toBe("Berger Straße");
    expect(m.values.city).toBe("Frankfurt am Main");
    expect(m.corrected.street).toBe(true);
    expect(m.corrected.city).toBe(true);
    expect(m.found.firstname).toBe(true);
    expect(m.found.phone).toBe(true);
    expect(m.count).toBeGreaterThan(0);
  });

  it("manual mit Teildaten: Felder + Badges, aber keine Adresskorrektur", () => {
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
    expect(m.found.companyName).toBe(true);
    expect(m.found.email).toBe(true);
    expect(m.corrected.street).toBeUndefined();
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
    expect(m.count).toBe(0);
  });
});
