import { describe, expect, it } from "vitest";
import { getCustomerName, toPreviewCustomer } from "./utils";

describe("customer utils", () => {
  it("ermittelt Namen für private Kunden und Firmen", () => {
    expect(
      getCustomerName({
        customer_type: "private",
        firstname: "Max",
        lastname: "Mustermann",
        company_name: null,
      }),
    ).toBe("Max Mustermann");
    expect(
      getCustomerName({
        customer_type: "business",
        firstname: null,
        lastname: null,
        company_name: "Müller GmbH",
      }),
    ).toBe("Müller GmbH");
  });

  it("akzeptiert einen Firmen-Snapshot ohne Vorname", () => {
    expect(
      toPreviewCustomer({
        customer_type: "business",
        company_name: "Müller GmbH",
        firstname: null,
        lastname: null,
        street: "Robert-Bosch-Straße",
        street_no: "11a",
        postcode: "55129",
        city: "Mainz",
        email: null,
        phone: null,
      }),
    ).toMatchObject({
      customer_type: "business",
      company_name: "Müller GmbH",
      streetNo: "11a",
    });
  });

  it("lehnt Snapshots ohne gültige Kundenart oder erforderlichen Namen ab", () => {
    expect(toPreviewCustomer({ customer_type: "company", company_name: "Test" })).toBeNull();
    expect(toPreviewCustomer({ customer_type: "private", firstname: null, lastname: null })).toBeNull();
  });
});
