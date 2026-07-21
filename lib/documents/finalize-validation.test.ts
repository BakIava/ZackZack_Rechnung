import { describe, expect, it } from "vitest";
import type { DocumentPreview } from "@/types/document";
import { canFinalizePreview } from "./finalize-validation";

function validPreview(overrides: Partial<DocumentPreview> = {}): DocumentPreview {
  return {
    id: "doc-1",
    docType: "invoice",
    status: "draft",
    documentNumber: null,
    issueDate: "2026-07-15",
    serviceDate: null,
    isKleinunternehmer: false,
    defaultTaxRate: 19,
    netAmount: 30_000,
    taxAmount: 5_700,
    totalAmount: 35_700,
    taxGroups: [{ rate: 19, netAmount: 30_000, taxAmount: 5_700 }],
    company: {
      name: "Yılmaz Malerbetrieb",
      legalForm: null,
      street: "Hauptstraße",
      streetNo: "1",
      postcode: "10115",
      city: "Berlin",
      phone: null,
      mobile: null,
      email: null,
      director: null,
      steuernummer: "12/345/67890",
      ustId: null,
      bankName: null,
      iban: null,
      bic: null,
      accountHolder: null,
      logoUrl: null,
      paymentDays: 14,
    },
    customer: {
      customer_type: "private",
      firstname: "Anna",
      lastname: "Schneider",
      company_name: null,
      street: "Gartenweg",
      streetNo: "4",
      postcode: "10117",
      city: "Berlin",
      email: null,
      phone: null,
    },
    items: [
      {
        position: 1,
        descriptionDe: "Malerarbeiten",
        amount: 1,
        unit: "Pauschale",
        unitPrice: 30_000,
        totalAmount: 30_000,
        taxRate: 19,
        taxAmount: 5_700,
        grossAmount: 35_700,
      },
    ],
    ...overrides,
  };
}

describe("serverseitige Finalisierungsprüfung", () => {
  it("akzeptiert für Rechnungen und Angebote eine USt-IdNr. statt der Steuernummer", () => {
    const company = {
      ...validPreview().company,
      steuernummer: null,
      ustId: "DE123456789",
    };

    expect(canFinalizePreview(validPreview({ company }))).toBe(true);
    expect(canFinalizePreview(validPreview({ docType: "quote", company }))).toBe(true);
    expect(
      canFinalizePreview(validPreview({
        company: { ...company, ustId: "  " },
      })),
    ).toBe(false);
  });

  it("bewertet die Kleinbetragsgrenze anhand des Bruttobetrags", () => {
    expect(
      canFinalizePreview(
        validPreview({
          netAmount: 21_008,
          taxAmount: 3_992,
          totalAmount: 25_000,
          customer: null,
        }),
      ),
    ).toBe(true);

    expect(
      canFinalizePreview(
        validPreview({
          netAmount: 21_009,
          taxAmount: 3_992,
          totalAmount: 25_001,
          customer: null,
        }),
      ),
    ).toBe(false);
  });

  it("blockiert Dokumente ohne Positionen auch bei direktem Action-Aufruf", () => {
    expect(canFinalizePreview(validPreview({ items: [] }))).toBe(false);
  });
});
