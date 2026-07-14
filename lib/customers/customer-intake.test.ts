import { describe, expect, it } from "vitest";
import {
  EMPTY_CUSTOMER_INTAKE,
  hasExtractedCustomerData,
  hasStructuredAddress,
  parseCustomerExtraction,
  parseCustomerExtractionJson,
  validateCustomerIntakeText,
} from "./customer-intake";

describe("customer intake domain", () => {
  it("normalisiert Strings und ignoriert zusätzliche Felder", () => {
    expect(
      parseCustomerExtraction({
        customer_type: "private",
        firstname: "  Max ",
        lastname: "Mustermann",
        notes: "darf nicht übernommen werden",
      }),
    ).toEqual({
      ...EMPTY_CUSTOMER_INTAKE,
      customer_type: "private",
      firstname: "Max",
      lastname: "Mustermann",
    });
  });

  it("setzt nur eine unbekannte Kundenart auf null", () => {
    expect(
      parseCustomerExtraction({
        customer_type: "company",
        company_name: "Müller GmbH",
        street: "Robert-Bosch-Straße",
        city: "Mainz",
      }),
    ).toMatchObject({
      customer_type: null,
      company_name: "Müller GmbH",
      street: "Robert-Bosch-Straße",
      city: "Mainz",
    });
  });

  it("verwirft ungültige Einzelfelder, ohne gültige Daten zu verlieren", () => {
    expect(
      parseCustomerExtraction({ firstname: 123, lastname: "Mustermann" }),
    ).toMatchObject({ firstname: null, lastname: "Mustermann" });
  });

  it("lehnt ungültiges JSON und Nicht-Objekte ab", () => {
    expect(parseCustomerExtractionJson("kein json")).toBeNull();
    expect(parseCustomerExtraction([])).toBeNull();
  });

  it("entscheidet ausschließlich anhand der geforderten Adressfelder", () => {
    expect(
      hasStructuredAddress({
        ...EMPTY_CUSTOMER_INTAKE,
        street: "Hauptstraße",
        city: "Mainz",
      }),
    ).toBe(true);
    expect(
      hasStructuredAddress({
        ...EMPTY_CUSTOMER_INTAKE,
        street: "Hauptstraße",
      }),
    ).toBe(false);
    expect(
      hasStructuredAddress({
        ...EMPTY_CUSTOMER_INTAKE,
        postcode: "55129",
        city: "Mainz",
      }),
    ).toBe(false);
  });

  it("erkennt leere Extraktionen und erzwingt das 500-Zeichen-Limit", () => {
    expect(hasExtractedCustomerData(EMPTY_CUSTOMER_INTAKE)).toBe(false);
    expect(validateCustomerIntakeText("  Max Mustermann  ")).toBe("Max Mustermann");
    expect(validateCustomerIntakeText("x".repeat(500))).toHaveLength(500);
    expect(validateCustomerIntakeText("x".repeat(501))).toBeNull();
    expect(validateCustomerIntakeText("   ")).toBeNull();
    expect(validateCustomerIntakeText(123)).toBeNull();
  });
});
