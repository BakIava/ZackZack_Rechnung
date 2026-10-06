import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { describe, expect, it } from "vitest";
import type { DocumentPreview } from "@/types/document";
import { renderDocumentPdfBuffer } from "./render-document";

function longPreview(): DocumentPreview {
  const additionalDescriptionDe = [
    "Anfangszeile",
    "Folgezeile",
    ...Array.from({ length: 140 }, (_, index) =>
      `Detailzeile ${String(index + 1).padStart(4, "0")} mit sorgfältiger Ausführung und Materialprüfung.`),
  ].join("\n");
  return {
    id: "pdf-description-fixture",
    docType: "invoice",
    status: "finalized",
    documentNumber: "R-2026-041",
    issueDate: "2026-06-09",
    serviceDate: null,
    servicePeriodStart: null,
    servicePeriodEnd: null,
    validUntil: null,
    isKleinunternehmer: true,
    defaultTaxRate: 0,
    netAmount: 48_000,
    taxAmount: 0,
    totalAmount: 48_000,
    taxGroups: [{ rate: 0, netAmount: 48_000, taxAmount: 0 }],
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
    items: [{
      position: 1, descriptionDe: "Innenanstrich Wohnzimmer", additionalDescriptionDe,
      amount: 1, unit: "psch", unitPrice: 48_000, totalAmount: 48_000,
      taxRate: 0, taxAmount: 0, grossAmount: 48_000,
    }],
    convertedInvoiceId: null,
    basedOnQuoteId: null,
    template: { id: "standard", version: 1 },
  };
}

describe("kanonisches PDF mit langer Positionsbeschreibung", () => {
  it("zeigt alle Zeilen auf A4-Seiten oberhalb von Summen und Footer", async () => {
    const buffer = await renderDocumentPdfBuffer(longPreview(), null);
    if (process.env.PDF_VISUAL_FIXTURE === "1") {
      const directory = path.join(process.cwd(), "output", "pdf");
      await mkdir(directory, { recursive: true });
      await writeFile(path.join(directory, "positionsbeschreibung-lang.pdf"), buffer);
    }

    const task = getDocument({ data: new Uint8Array(buffer) });
    try {
      const pdf = await task.promise;
      expect(pdf.numPages).toBeGreaterThan(3);
      const allText: string[] = [];
      for (let number = 1; number <= pdf.numPages; number += 1) {
        const page = await pdf.getPage(number);
        expect(page.view[2] - page.view[0]).toBeCloseTo(595.28, 1);
        expect(page.view[3] - page.view[1]).toBeCloseTo(841.89, 1);
        const content = await page.getTextContent();
        const textItems = content.items.filter((item) => "str" in item);
        const pageText = textItems.map((item) => item.str).join(" ");
        allText.push(pageText);
        const detailItems = textItems.filter((item) =>
          /Detailzeile|Materialprüfung|sorgfältiger|Anfangszeile|Folgezeile/.test(item.str));
        for (const item of detailItems) {
          expect(item.transform[5]).toBeGreaterThan(130);
          expect(item.transform[5]).toBeLessThan(800);
        }
        const footer = textItems.find((item) => item.str.includes("Bank & Steuer"));
        if (footer && detailItems.length > 0) {
          expect(Math.min(...detailItems.map((item) => item.transform[5])))
            .toBeGreaterThan(footer.transform[5] + 35);
        }
        const sum = textItems.find((item) =>
          /Gesamt \(netto\)|Rechnungsbetrag|Angebotssumme/.test(item.str));
        if (sum && detailItems.length > 0) {
          expect(Math.min(...detailItems.map((item) => item.transform[5])))
            .toBeGreaterThan(sum.transform[5] + 15);
        }
      }
      const text = allText.join(" ");
      expect(text).toContain("Innenanstrich Wohnzimmer");
      expect(text).toContain("Anfangszeile");
      expect(text).toContain("Folgezeile");
      for (let index = 1; index <= 140; index += 1) {
        expect(text).toContain(`Detailzeile ${String(index).padStart(4, "0")}`);
      }
      expect(text).not.toContain("…");
      expect(text).toContain("480,00");
      expect(text).toContain("Gemäß § 19 UStG");
      expect(text).not.toMatch(/purchase|surcharge|einkauf|marge|aufschlag/i);

      const firstPage = await pdf.getPage(1);
      const firstItems = (await firstPage.getTextContent()).items.filter((item) => "str" in item);
      const firstLine = firstItems.find((item) => item.str === "Anfangszeile");
      const secondLine = firstItems.find((item) => item.str === "Folgezeile");
      expect(firstLine).toBeDefined();
      expect(secondLine).toBeDefined();
      expect(firstLine!.transform[5]).toBeGreaterThan(secondLine!.transform[5]);
    } finally {
      await task.destroy();
    }
  }, 60_000);

  it("behält bei steuerpflichtigen Positionen Verkaufspreis und Steuerdarstellung bei", async () => {
    const preview = longPreview();
    preview.items[0].additionalDescriptionDe = "Erster Schritt\nZweiter Schritt";
    preview.items[0].taxRate = 19;
    preview.items[0].taxAmount = 9_120;
    preview.items[0].grossAmount = 57_120;
    preview.taxAmount = 9_120;
    preview.totalAmount = 57_120;
    preview.taxGroups = [{ rate: 19, netAmount: 48_000, taxAmount: 9_120 }];
    const buffer = await renderDocumentPdfBuffer(preview, null);
    const task = getDocument({ data: new Uint8Array(buffer) });
    try {
      const pdf = await task.promise;
      const content = await (await pdf.getPage(1)).getTextContent();
      const text = content.items.map((item) => "str" in item ? item.str : "").join(" ");
      expect(text).toContain("Erster Schritt");
      expect(text).toContain("Zweiter Schritt");
      expect(text).toContain("480,00");
      expect(text).toContain("19 %");
      expect(text).toContain("91,20");
      expect(text).toContain("571,20");
      expect(text).not.toContain("Gemäß § 19 UStG");
      expect(text).not.toMatch(/purchase|surcharge|einkauf|marge|aufschlag/i);
    } finally {
      await task.destroy();
    }
  }, 60_000);
});
