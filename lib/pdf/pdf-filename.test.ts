import { describe, expect, it } from "vitest";
import { pdfFileName } from "./pdf-filename";
import type { DocumentPreview } from "@/types/document";

function base(overrides: Partial<DocumentPreview>): DocumentPreview {
  return {
    id: "d1",
    docType: "invoice",
    status: "finalized",
    documentNumber: "R-2026-041",
    issueDate: "2026-06-09",
    serviceDate: null,
    isKleinunternehmer: true,
    defaultTaxRate: 0,
    netAmount: 0,
    taxAmount: 0,
    totalAmount: 0,
    taxGroups: [],
    company: {
      name: "Firma",
      legalForm: null,
      street: null,
      streetNo: null,
      postcode: null,
      city: null,
      phone: null,
      mobile: null,
      email: null,
      director: null,
      steuernummer: null,
      ustId: null,
      bankName: null,
      iban: null,
      bic: null,
      accountHolder: null,
      logoUrl: null,
      paymentDays: 14,
    },
    customer: null,
    items: [],
    ...overrides,
  };
}

describe("pdfFileName", () => {
  it("baut einen deterministischen deutschen Dateinamen", () => {
    const name = pdfFileName(base({}));
    expect(name).toBe("Rechnung_R-2026-041.pdf");
    // reproduzierbar
    expect(pdfFileName(base({}))).toBe(name);
  });

  it("unterscheidet Angebot und Rechnung", () => {
    expect(pdfFileName(base({ docType: "quote", documentNumber: "A-2026-088" }))).toBe(
      "Angebot_A-2026-088.pdf",
    );
  });

  it("reduziert Sonderzeichen/Umlaute auf ASCII", () => {
    expect(pdfFileName(base({ documentNumber: "R/2026 Nüß" }))).toBe(
      "Rechnung_R-2026-Nuess.pdf",
    );
  });
});
