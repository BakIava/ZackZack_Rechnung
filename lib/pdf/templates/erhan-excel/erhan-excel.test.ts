import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { describe, expect, it } from "vitest";
import { calculateDocumentTotals, calculateLineAmounts } from "@/lib/documents/tax";
import { renderDocumentPdfBuffer } from "@/lib/pdf/render-document";
import type { DocumentItem, DocumentPreview, TaxRate } from "@/types/document";

/** Künstliche Beispieldaten — keine echten Firmen-, Kunden- oder Belegwerte. */
const company: DocumentPreview["company"] = {
  name: "Fliesenfachbetrieb MUSTER", legalForm: "Einzelunternehmen",
  street: "Neuweg", streetNo: "78", postcode: "55218", city: "Ingelheim",
  phone: "06132-1234567", mobile: "0171-7654321", fax: "06132-1234568", email: null,
  director: "Emre Muster", steuernummer: "08/123/45678", ustId: null,
  bankName: "Volksbank Musterland", iban: "DE02 1203 0000 0000 2020 51", bic: "BYLADEM1001",
  accountHolder: null, logoUrl: null, paymentDays: 14,
};

const customer: NonNullable<DocumentPreview["customer"]> = {
  customer_type: "private", firstname: "Jonas", lastname: "Beispiel",
  company_name: null, street: "Lindenstr.", streetNo: "1",
  postcode: "55262", city: "Ingelheim", email: null, phone: null,
};

function line(
  position: number,
  descriptionDe: string,
  amount: number,
  unit: string,
  unitPrice: number,
  taxRate: TaxRate,
  additionalDescriptionDe: string | null = null,
): DocumentItem {
  const amounts = calculateLineAmounts(unitPrice, amount, taxRate);
  return {
    position, descriptionDe, additionalDescriptionDe, amount, unit, unitPrice,
    totalAmount: amounts.netAmount, taxRate, taxAmount: amounts.taxAmount,
    grossAmount: amounts.grossAmount,
  };
}

function preview(items: DocumentItem[], overrides: Partial<DocumentPreview> = {}): DocumentPreview {
  const totals = calculateDocumentTotals(items.map((item) => ({
    netAmount: item.totalAmount, taxRate: item.taxRate,
    taxAmount: item.taxAmount, grossAmount: item.grossAmount,
  })));
  return {
    id: "erhan-fixture", docType: "invoice", status: "finalized", documentNumber: "R-2026-005",
    issueDate: "2026-04-06", serviceDate: null, servicePeriodStart: "2026-04-01",
    servicePeriodEnd: "2026-04-30", validUntil: null, isKleinunternehmer: false, defaultTaxRate: 19,
    netAmount: totals.netAmount, taxAmount: totals.taxAmount, totalAmount: totals.grossAmount,
    taxGroups: totals.taxGroups, company, customer, items,
    convertedInvoiceId: null, basedOnQuoteId: null,
    template: { id: "erhan-excel", version: 1 },
    ...overrides,
  };
}

const kleinunternehmer: Partial<DocumentPreview> = { isKleinunternehmer: true, defaultTaxRate: 0 };

const steps = (count: number, text: string) =>
  Array.from({ length: count }, (_, index) => `${text} ${index + 1}.`).join("\n");

const FIXTURES: Record<string, DocumentPreview> = {
  "single-vat": preview([
    line(1, "Mauer, Trockenbau und Fliesenarbeiten", 1, "pausch", 200_000, 19, "im Bad inkl. Material"),
  ]),
  "multiple-mixed-vat": preview(Array.from({ length: 40 }, (_, index) => line(
    index + 1, `Fliesen verlegen Raum ${index + 1}, inkl. Fugen`,
    index % 3 === 0 ? 12.5 : 1, index % 3 === 0 ? "m²" : "Pauschale",
    4_500 + index * 150, index % 4 === 0 ? 7 : 19,
  ))),
  "long-description": preview([
    line(1, "Badsanierung komplett", 1, "Pauschale", 1_250_000, 19,
      steps(70, "Arbeitsschritt: Untergrund prüfen, grundieren, abdichten und Fliesen im Dünnbett verlegen")),
    line(2, "Entsorgung Bauschutt", 2, "Container", 38_000, 19),
  ]),
  "caps-and-compounds": preview([
    line(1, "WANDFLIESEN GROSSFORMAT VERLEGEN UND VERFUGEN IM GÄSTE-WC ÜBER ZWEI WÄNDE", 18.75, "m²", 6_900, 19,
      steps(24, "VORBEREITUNG DES UNTERGRUNDES MIT HAFTGRUND UND ABDICHTUNG")),
    line(2, "Natursteinfensterbankaustauschvorbereitungsarbeiten", 3, "Stk.", 12_000, 19),
  ], { company: { ...company, email: "info@fliesen-muster-ingelheim.example" } }),
  "k19": preview(
    [line(1, "Silikonfugen Bad erneuert", 1, "psch", 18_000, 0), line(2, "Anfahrt", 1, "psch", 3_500, 0)],
    kleinunternehmer,
  ),
  "quote": preview([line(1, "Terrassenplatten verlegen", 24.5, "m²", 5_900, 19)], {
    docType: "quote", documentNumber: "A-2026-012", validUntil: "2026-05-06",
    servicePeriodStart: null, servicePeriodEnd: null,
  }),
};

interface PdfText { str: string; x: number; width: number; baseline: number; size: number }

async function renderPages(name: string): Promise<{ pages: PdfText[][]; sizes: number[][] }> {
  const buffer = await renderDocumentPdfBuffer(FIXTURES[name], null);
  if (process.env.PDF_VISUAL_FIXTURE === "1") {
    const directory = path.join(process.cwd(), "output", "pdf");
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, `erhan-excel-${name}.pdf`), buffer);
  }
  const task = getDocument({ data: new Uint8Array(buffer) });
  try {
    const pdf = await task.promise;
    const pages: PdfText[][] = [];
    const sizes: number[][] = [];
    for (let number = 1; number <= pdf.numPages; number += 1) {
      const page = await pdf.getPage(number);
      sizes.push([page.view[2] - page.view[0], page.view[3] - page.view[1]]);
      const content = await page.getTextContent();
      pages.push(content.items.flatMap((item) => ("str" in item && item.str.trim()
        ? [{ str: item.str, x: item.transform[4], width: item.width, baseline: page.view[3] - item.transform[5], size: item.transform[0] }]
        : [])));
    }
    return { pages, sizes };
  } finally {
    await task.destroy();
  }
}

const text = (page: PdfText[]) => page.map((item) => item.str).join(" ");
const FOOTER_SIZE = 8;
const GRID_BOTTOM = 739.5;
const ROW = 12.75;

function collisions(page: PdfText[]): string[] {
  const boxes = page.map((item) => ({
    item, left: item.x + 0.3, right: item.x + item.width - 0.3,
    top: item.baseline - item.size * 0.7,
    bottom: item.baseline + item.size * (/[gjpqyQ,;()]/.test(item.str) ? 0.2 : 0.02),
  }));
  const found: string[] = [];
  for (let a = 0; a < boxes.length; a += 1) {
    for (let b = a + 1; b < boxes.length; b += 1) {
      const p = boxes[a];
      const q = boxes[b];
      if (p.left < q.right && q.left < p.right && p.top < q.bottom && q.top < p.bottom) {
        found.push(`${p.item.str} ↔ ${q.item.str}`);
      }
    }
  }
  return found;
}

/** Positions- und Summentext sitzt auf dem Excel-Zeilenraster (Grundlinie 10–10,5 pt unter einer Rasterlinie). */
function offGrid(page: PdfText[], gridTop: number): string[] {
  const rowsTop = gridTop + 2 * ROW;
  return page
    .filter((item) => item.size === 10 && item.baseline > rowsTop && item.baseline < GRID_BOTTOM)
    .filter((item) => {
      const offset = (((item.baseline - rowsTop) % ROW) + ROW) % ROW;
      return Math.abs(offset - 10.25) > 0.6;
    })
    .map((item) => `${item.str}@${item.baseline.toFixed(2)}`);
}

describe("erhan-excel – Seitenaufbau", () => {
  it.each(Object.keys(FIXTURES))("%s: A4, Raster, keine Überlappung, nichts im Fußbereich", async (name) => {
    const { pages, sizes } = await renderPages(name);
    for (const [width, height] of sizes) {
      expect(width).toBeCloseTo(595.28, 1);
      expect(height).toBeCloseTo(841.89, 1);
    }
    pages.forEach((page, index) => {
      expect(collisions(page)).toEqual([]);
      expect(offGrid(page, index === 0 ? 369.75 : 76.5)).toEqual([]);
      const contentBelowGrid = page.filter((item) =>
        item.baseline > GRID_BOTTOM + 2 && Math.abs(item.size - FOOTER_SIZE) > 0.01);
      expect(contentBelowGrid).toEqual([]);
      expect(text(page)).toContain(`Seite ${index + 1} von ${pages.length}`);
      expect(text(page)).toContain("Leistung-Material");
      expect(text(page)).toContain("Steuernummer: 08/123/45678");
    });
    const all = pages.map(text).join(" ").toLowerCase();
    expect(all).not.toMatch(/purchase|surcharge|einkauf|marge|aufschlag/);
  }, 60_000);

  it("einzelne Position: Kopf, Kontakt, Leistungszeitraum, Netto/Mwst/Gesamt", async () => {
    const { pages } = await renderPages("single-vat");
    expect(pages).toHaveLength(1);
    const page = text(pages[0]);
    for (const expected of [
      "Rechnung", "Rechnungs-Nr. R-2026-005", "Ingelheim, den 06.04.2026",
      "Tel.:", "Mobil.:", "Fax.:", "06132-1234568", "Jonas Beispiel", "Lindenstr. 1",
      "Leistungszeitraum 01.04.2026 – 30.04.2026",
      "Mauer, Trockenbau und Fliesenarbeiten", "im Bad inkl. Material", "pausch", "1,00", "2.000,00",
      "Nettobetrag", "Mwst 19%", "380,00", "Gesamtbetrag", "2.380,00",
      "Zahlbar innerhalb von 14 Tagen", "Bankverbindung:",
    ]) {
      expect(page).toContain(expected);
    }
    expect(page).not.toContain("E-Mail:");
    expect(page).not.toContain("§ 19");
  }, 60_000);

  it("mehrere Steuersätze: Satz je Position, eine Mwst-Zeile je Satz, Seitenumbruch mit Zwischensummen", async () => {
    const { pages } = await renderPages("multiple-mixed-vat");
    expect(pages.length).toBeGreaterThan(1);
    const all = pages.map(text).join(" ");
    for (let index = 1; index <= 40; index += 1) {
      expect(all.match(new RegExp(`Raum ${index},`, "g"))).toHaveLength(1);
    }
    pages.slice(0, -1).forEach((page) => {
      expect(text(page)).toContain("Zwischensumme");
      expect(text(page)).not.toContain("Gesamtbetrag");
    });
    const last = text(pages.at(-1)!);
    expect(last).toContain("Mwst 19%");
    expect(last).toContain("Mwst 7%");
    expect(all).toContain("7 %");
    expect(text(pages[1])).toContain("Rechnungs-Nr. R-2026-005");
    expect(text(pages[1])).not.toContain("Tel.:");
  }, 60_000);

  it("lange Beschreibungen laufen über Seiten, ohne Zeilen zu verlieren", async () => {
    const { pages } = await renderPages("long-description");
    expect(pages.length).toBeGreaterThan(2);
    // Fortlaufender Text der Spalte „Leistung-Material“ über alle Seiten.
    const column = pages
      .flatMap((page) => page.filter((item) => item.size === 10 && item.x > 83 && item.x < 300 && item.baseline > 100))
      .map((item) => item.str)
      .join(" ");
    for (let index = 1; index <= 70; index += 1) {
      expect(column).toContain(`Dünnbett verlegen ${index}.`);
    }
    expect(text(pages.at(-1)!)).toContain("Entsorgung Bauschutt");
  }, 60_000);

  it("Versalien, Komposita und lange E-Mail bleiben in ihren Zellen", async () => {
    const all = (await renderPages("caps-and-compounds")).pages.map(text).join(" ");
    expect(all).toContain("VORBEREITUNG DES UNTERGRUNDES");
    expect(all).toContain("info@fliesen-muster-ingelheim.example");
  }, 60_000);

  it("§19: nur Gesamtbetrag und exakter §19-Hinweis", async () => {
    const page = text((await renderPages("k19")).pages[0]);
    expect(page).toContain("Gesamtbetrag");
    expect(page).toContain("215,00");
    expect(page).toContain("Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.");
    expect(page).not.toContain("Nettobetrag");
    expect(page).not.toContain("Mwst");
  }, 60_000);

  it("Angebot: Titel, Nummer und Gültigkeit, kein Zahlungsziel", async () => {
    const page = text((await renderPages("quote")).pages[0]);
    expect(page).toContain("Angebot");
    expect(page).toContain("Angebots-Nr. A-2026-012");
    expect(page).toContain("Gültig bis: 06.05.2026");
    expect(page).not.toContain("Zahlbar");
  }, 60_000);
});
