import { renderToBuffer } from "@react-pdf/renderer";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { describe, expect, it } from "vitest";
import type { DocumentPreview } from "@/types/document";
import { registerPdfFonts } from "./fonts";
import { buildDocumentRenderData } from "./render-data";
import { renderDocumentPdfBuffer } from "./render-document";
import { StandardTemplate } from "./templates/standard/standard-template";
import { DocumentTemplateError } from "./templates/template-catalog";

function preview(overrides: Partial<DocumentPreview> = {}): DocumentPreview {
  return {
    id: "render-fixture",
    docType: "invoice",
    status: "finalized",
    documentNumber: "R-2026-041",
    issueDate: "2026-06-09",
    serviceDate: "2026-06-05",
    servicePeriodStart: null,
    servicePeriodEnd: null,
    validUntil: null,
    isKleinunternehmer: false,
    defaultTaxRate: 19,
    netAmount: 73_000,
    taxAmount: 4_750,
    totalAmount: 77_750,
    taxGroups: [
      { rate: 19, netAmount: 25_000, taxAmount: 4_750 },
      { rate: 0, netAmount: 48_000, taxAmount: 0 },
    ],
    company: {
      name: "Yılmaz Malerbetrieb", legalForm: null,
      street: "Musterstraße", streetNo: "12", postcode: "10115", city: "Berlin",
      phone: "030 123456", mobile: null, website: null, fax: null, email: "info@yilmaz-maler.de",
      director: "Ahmet Yılmaz", steuernummer: "12/345/67890", ustId: null,
      bankName: "Sparkasse Berlin", iban: "DE12 3456 7890 1234 5678 90",
      bic: null, accountHolder: null, logoUrl: null, paymentDays: 14,
    },
    customer: {
      customer_type: "private", firstname: "Familie", lastname: "Schneider",
      company_name: null, street: "Gartenweg", streetNo: "4",
      postcode: "10117", city: "Berlin", email: null, phone: null,
    },
    items: [
      {
        position: 1, descriptionDe: "Innenanstrich Wohnzimmer", additionalDescriptionDe: null,
        amount: 1, unit: "psch", unitPrice: 48_000, totalAmount: 48_000,
        taxRate: 0, taxAmount: 0, grossAmount: 48_000,
      },
      {
        position: 2, descriptionDe: "Gerüst", additionalDescriptionDe: "Auf- und Abbau",
        amount: 1, unit: "psch", unitPrice: 25_000, totalAmount: 25_000,
        taxRate: 19, taxAmount: 4_750, grossAmount: 29_750,
      },
    ],
    convertedInvoiceId: null,
    basedOnQuoteId: null,
    template: { id: "standard", version: 1 },
    ...overrides,
  };
}

/**
 * Visuelle Signatur: Seitengeometrie, positionierte Textläufe und die
 * vollständige Zeichenoperatorliste. Unabhängig von den zufälligen
 * Font-Subset-Präfixen und der Dokument-ID, die React-PDF je Lauf neu vergibt
 * (Byte-Vergleich ist deshalb selbst zwischen zwei identischen Läufen unmöglich).
 */
async function visualSignature(buffer: Buffer): Promise<string> {
  const task = getDocument({ data: new Uint8Array(buffer) });
  try {
    const pdf = await task.promise;
    const pages: unknown[] = [];
    for (let number = 1; number <= pdf.numPages; number += 1) {
      const page = await pdf.getPage(number);
      const text = await page.getTextContent();
      const ops = await page.getOperatorList();
      pages.push({
        view: page.view,
        text: text.items.map((item) => ("str" in item ? [item.str, item.transform, item.width] : null)),
        fn: Array.from(ops.fnArray),
        args: JSON.stringify(ops.argsArray, (_key, value) =>
          ArrayBuffer.isView(value) ? (value as Uint8Array).byteLength : value),
      });
    }
    // pdf.js nummeriert geladene Fonts je Dokument (g_d0_f1, g_d1_f1, …).
    return JSON.stringify(pages).replace(/\bg_d\d+_/g, "g_d_");
  } finally {
    await task.destroy();
  }
}

describe("renderDocumentPdfBuffer – Vorlagenauswahl", () => {
  it("rendert den Default exakt wie das bestehende Standard-Layout", async () => {
    const p = preview();
    const viaDocumentPath = await renderDocumentPdfBuffer(p, null);
    registerPdfFonts();
    const direct = await renderToBuffer(
      <StandardTemplate data={buildDocumentRenderData(p, null)} />,
    );
    expect(await visualSignature(viaDocumentPath)).toBe(await visualSignature(direct));
  }, 60_000);

  it.each([
    [{ id: "ths-classic", version: 2 }, "unknown_template_version"],
    [{ id: "erhan-excel", version: 2 }, "unknown_template_version"],
    [{ id: "standard", version: 2 }, "unknown_template_version"],
    [{ id: "unbekannt", version: 1 }, "unknown_template"],
  ])("lehnt %o ab, bevor ein PDF entsteht (%s)", async (template, code) => {
    const p = preview({ template: template as DocumentPreview["template"] });
    await expect(renderDocumentPdfBuffer(p, null)).rejects.toSatisfy(
      (error) => error instanceof DocumentTemplateError && error.code === code,
    );
  });
});
