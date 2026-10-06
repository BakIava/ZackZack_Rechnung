import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getDocument, OPS } from "pdfjs-dist/legacy/build/pdf.mjs";
import { describe, expect, it } from "vitest";
import { calculateDocumentTotals, calculateLineAmounts } from "@/lib/documents/tax";
import { renderDocumentPdfBuffer } from "@/lib/pdf/render-document";
import { buildDocumentRenderData } from "@/lib/pdf/render-data";
import type { DocumentItem, DocumentPreview, TaxRate } from "@/types/document";
import { ERHAN_LOGO_CENTER_X, erhanFirstPageShift } from "./erhan-excel-layout";
import { ERHAN_LOGO_DATA_URL } from "./erhan-excel-logo";
import { ERHAN_GEOMETRY } from "./erhan-excel.styles";

/** Künstliche Beispieldaten — keine echten Firmen-, Kunden- oder Belegwerte. */
const company: DocumentPreview["company"] = {
  name: "Fliesenfachbetrieb MUSTER", legalForm: "Einzelunternehmen",
  street: "Neuweg", streetNo: "78", postcode: "55218", city: "Ingelheim",
  phone: "06132-1234567", mobile: "0171-7654321", website: null, fax: "06132-1234568", email: null,
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
  "with-location": preview([
    line(1, "Mauer, Trockenbau und Fliesenarbeiten", 1, "pausch", 200_000, 19, "im Bad inkl. Material"),
  ], { serviceLocation: {
    name: "", street: "Otto-Hahn-Str.", houseNumber: "8", postcode: "", city: "Ingelheim",
    addressExtra: "1. OG rechts",
  } }),
  "name-only-location": preview([line(1, "Malerarbeiten im Wohnzimmer", 1, "pausch", 68_000, 19)], {
    serviceLocation: {
      name: "Wohnung Familie Yılmaz", street: "", houseNumber: "", postcode: "",
      city: "", addressExtra: "",
    },
  }),
  "quote-with-location": preview([line(1, "Terrassenplatten verlegen", 24.5, "m²", 5_900, 19)], {
    docType: "quote", documentNumber: "A-2026-012", validUntil: "2026-05-06",
    servicePeriodStart: null, servicePeriodEnd: null,
    serviceLocation: {
      name: "Baustelle Familie Schneider", street: "Gartenstraße", houseNumber: "12",
      postcode: "55116", city: "Mainz", addressExtra: "Hinterhaus",
    },
  }),
  "long-location": preview([line(1, "Wände streichen", 1, "psch", 25_000, 19)], {
    serviceLocation: {
      name: "Sanierung der Büroräume im Gewerbepark am Rhein, Gebäude West, Abschnitt C",
      street: "Lange Straße am Industrie- und Gewerbepark mit Zufahrt über den Betriebshof", houseNumber: "128a",
      postcode: "55116", city: "Mainz",
      addressExtra: "Hinterhaus, dritter Stock, Treppe B. Zugang über den Innenhof beim Nebengebäude. Bitte am Seiteneingang melden; der Arbeitsbereich liegt im Flur hinter dem Lastenaufzug.",
    },
  }),
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
  ], { company: { ...company, city: "Ingelheim am Rhein", email: "info@fliesen-muster-ingelheim.example" } }),
  "k19": preview(
    [line(1, "Silikonfugen Bad erneuert", 1, "psch", 18_000, 0), line(2, "Anfahrt", 1, "psch", 3_500, 0)],
    kleinunternehmer,
  ),
  "quote": preview([line(1, "Terrassenplatten verlegen", 24.5, "m²", 5_900, 19)], {
    docType: "quote", documentNumber: "A-2026-012", validUntil: "2026-05-06",
    servicePeriodStart: null, servicePeriodEnd: null,
  }),
  // Kontaktwerte nach Vorgabe des Betriebs: nur Mobil, E-Mail und Web.
  "mobile-email-web": preview([line(1, "Bodenfliesen verlegen", 32, "m²", 4_800, 19)], {
    company: {
      ...company, phone: null, fax: null,
      mobile: "0171 - 72 11 13 34", email: "info@fliesen-erhan.de", website: "fliesen-erhan.de",
    },
  }),
};

interface PdfText { str: string; x: number; width: number; baseline: number; size: number }

async function renderPages(name: string): Promise<{ pages: PdfText[][]; sizes: number[][] }> {
  const buffer = await renderDocumentPdfBuffer(FIXTURES[name], null);
  const visualFixtures = process.env.PDF_VISUAL_FIXTURE?.split(",") ?? [];
  if (visualFixtures.includes("1") || visualFixtures.includes(name)) {
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
      const shift = erhanFirstPageShift(buildDocumentRenderData(FIXTURES[name], null));
      expect(offGrid(page, index === 0 ? 369.75 + shift : 76.5)).toEqual([]);
      const contentBelowGrid = page.filter((item) =>
        item.baseline > GRID_BOTTOM + 2 && Math.abs(item.size - FOOTER_SIZE) > 0.01);
      expect(contentBelowGrid).toEqual([]);
      if (pages.length > 1) expect(text(page)).toContain(`Seite ${index + 1} von ${pages.length}`);
      else expect(text(page)).not.toMatch(/\bSeite \d+ von \d+/);
      expect(text(page)).toContain("Leistung-Material");
      expect(text(page)).toContain("St.Nr.: 08/123/45678");
    });
    const all = pages.map(text).join(" ").toLowerCase();
    expect(all).not.toMatch(/purchase|surcharge|einkauf|marge|aufschlag/);
  }, 60_000);

  it("festes Vorlagen-Logo: aus dem Projekt-PNG generiert und ohne Firmenlogo auf Seite 1", async () => {
    const pngSize = (bytes: Buffer) => ({ width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) });
    const source = pngSize(await readFile(path.join(process.cwd(), "lib", "pdf", "templates", "erhan-excel", "erhan-excel-logo.png")));
    const [prefix, base64] = ERHAN_LOGO_DATA_URL.split(",");
    expect(prefix).toBe("data:image/png;base64");
    const embedded = pngSize(Buffer.from(base64, "base64"));
    expect(embedded.width / embedded.height).toBeCloseTo(source.width / source.height, 1);

    const buffer = await renderDocumentPdfBuffer(FIXTURES["single-vat"], null);
    const task = getDocument({ data: new Uint8Array(buffer) });
    try {
      const page = await (await task.promise).getPage(1);
      const { fnArray, argsArray } = await page.getOperatorList();
      expect(fnArray).toContain(OPS.paintImageXObject);
      // Text und Summenlinie in Dunkelgrau (#333333), kein reines Schwarz.
      const fills = fnArray.flatMap((fn, index) => (fn === OPS.setFillRGBColor ? [argsArray[index][0]] : []));
      expect(fills.length).toBeGreaterThan(0);
      expect(new Set(fills)).toEqual(new Set(["#333333"]));
    } finally {
      await task.destroy();
    }
  }, 60_000);

  it("nur Mobil, E-Mail und Web: drei Kontaktzeilen in dieser Reihenfolge, ohne Lücken", async () => {
    const page = (await renderPages("mobile-email-web")).pages[0];
    const rows = [144, 156.25, 168.5].map((baseline) =>
      text(page.filter((item) => item.x > 340 && Math.abs(item.baseline - baseline) < 0.5)));
    expect(rows).toEqual([
      "Mobil.: 0171 - 72 11 13 34",
      "E-Mail: info@fliesen-erhan.de",
      "Web: fliesen-erhan.de",
    ]);
    const all = text(page);
    expect(all).not.toContain("Tel.:");
    expect(all).not.toContain("Fax.:");
  }, 60_000);

  it.each(["single-vat", "caps-and-compounds", "mobile-email-web"])("%s: Kontaktblock mittig unter dem Logo", async (name) => {
    const page = (await renderPages(name)).pages[0];
    const contact = page.filter((item) => item.baseline > 140 && item.baseline < 185 && item.x > 340);
    expect(contact.length).toBeGreaterThanOrEqual(6);
    const left = Math.min(...contact.map((item) => item.x));
    const right = Math.max(...contact.map((item) => item.x + item.width));
    // Toleranz: 1 pt Messreserve und Glyphen-Seitenränder.
    expect(Math.abs((left + right) / 2 - ERHAN_LOGO_CENTER_X)).toBeLessThan(1.5);
    expect(ERHAN_GEOMETRY.logo.top + ERHAN_GEOMETRY.logo.height).toBeLessThan(144 - 12);
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
      "Zahlbar innerhalb von 14 Tagen",
    ]) {
      expect(page).toContain(expected);
    }
    expect(page).not.toContain("E-Mail:");
    expect(page).not.toContain("§ 19");
  }, 60_000);

  it("Einsatzort steht im bestehenden Erhan-PDF unter der Rechnungsnummer", async () => {
    const page = (await renderPages("with-location")).pages[0];
    const all = text(page);
    expect(all).toContain("Einsatzort: Otto-Hahn-Str. 8, Ingelheim");
    expect(all).toContain("1. OG rechts");
    const number = page.find((item) => item.str.includes("Rechnungs-Nr."))!;
    const location = page.find((item) => item.str === "Einsatzort:")!;
    const details = page.filter((item) => item.str === "Otto-Hahn-Str. 8, Ingelheim" || item.str === "1. OG rechts");
    const table = page.find((item) => item.str === "Leistung-Material")!;
    expect(number.baseline).toBeLessThan(location.baseline);
    expect(details).toHaveLength(2);
    expect(details.every((item) => Math.abs(item.x - (ERHAN_GEOMETRY.left + ERHAN_GEOMETRY.locationIndent)) < 0.5))
      .toBe(true);
    expect(Math.max(...details.map((item) => item.baseline)) + 20).toBeLessThan(table.baseline);
  }, 60_000);

  it("Angebot zeigt Einsatzort und Gültigkeit ohne Überlappung", async () => {
    const page = (await renderPages("quote-with-location")).pages[0];
    expect(text(page)).toContain("Baustelle Familie Schneider");
    const location = page.find((item) => item.str.startsWith("Einsatzort:"))!;
    const valid = page.find((item) => item.str.startsWith("Gültig bis:"))!;
    expect(location.baseline).toBeLessThan(valid.baseline);
    expect(collisions(page)).toEqual([]);
  }, 60_000);

  it("einzeiliger Ortsname hält den Abstand zu den Positionen", async () => {
    const page = (await renderPages("name-only-location")).pages[0];
    expect(text(page)).toContain("Einsatzort: Wohnung Familie");
    // pdfjs ersetzt das türkische ı beim Textextrahieren; visuell ist es im PDF vorhanden.
    const location = page.find((item) => item.str.startsWith("Wohnung Familie Y"))!;
    const table = page.find((item) => item.str === "Leistung-Material")!;
    expect(table.baseline - location.baseline).toBeGreaterThan(40);
    expect(collisions(page)).toEqual([]);
  }, 60_000);

  it("lange Ortsangaben verschieben die erste Tabelle, statt sie zu überdecken", async () => {
    const page = (await renderPages("long-location")).pages[0];
    const location = page.filter((item) => item.str.includes("Einsatzort:") || item.str.includes("Hinterhaus"));
    const table = page.find((item) => item.str === "Leistung-Material")!;
    expect(location.length).toBeGreaterThan(0);
    expect(Math.max(...location.map((item) => item.baseline))).toBeLessThan(table.baseline);
    expect(collisions(page)).toEqual([]);
  }, 60_000);

  it("Fußzeile: drei Spalten Firma | Bank | Steuernummer und Inhaber, je drei Zeilen", async () => {
    const page = (await renderPages("single-vat")).pages[0];
    const footer = page.filter((item) => item.baseline > 760);
    const column = (x: (item: PdfText) => boolean) =>
      footer.filter(x).sort((a, b) => a.baseline - b.baseline).map((item) => item.str);
    expect(column((item) => item.x < 150)).toEqual([
      "Fliesenfachbetrieb MUSTER", "Neuweg 78", "55218 Ingelheim",
    ]);
    expect(column((item) => item.x > 200 && item.x + item.width < 400)).toEqual([
      "Volksbank Musterland", "IBAN: DE02 1203 0000 0000 2020 51", "BIC: BYLADEM1001",
    ]);
    const right = footer.filter((item) => item.x > 400);
    expect(right.map((item) => item.str)).toEqual(["St.Nr.: 08/123/45678", "Geschäftsinhaber", "Emre Muster"]);
    for (const item of right) expect(item.x + item.width).toBeCloseTo(542.15, 0);
    expect(new Set(footer.map((item) => Math.round(item.baseline)))).toEqual(new Set([766, 776, 786]));
    expect(footer.every((item) => Math.abs(item.size - FOOTER_SIZE) < 0.01)).toBe(true);
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

  it("langer Ortsname: „Ort, den Datum“ bleibt einzeilig in 12 pt", async () => {
    const page = (await renderPages("caps-and-compounds")).pages[0];
    const dateLine = page.filter((item) => Math.abs(item.baseline - 213.75) < 0.5);
    expect(text(dateLine)).toBe("Ingelheim am Rhein, den 06.04.2026");
    expect(dateLine.every((item) => Math.abs(item.size - 12) < 0.01)).toBe(true);
    expect(page.filter((item) => item.str.includes("06.04.2026"))).toHaveLength(1);
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
