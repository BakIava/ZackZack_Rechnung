import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { calculateDocumentTotals, calculateLineAmounts } from "@/lib/documents/tax";
import { renderDocumentPdfBuffer } from "@/lib/pdf/render-document";
import type { DocumentItem, DocumentPreview, TaxRate } from "@/types/document";
import { ERHAN_COLUMNS, ERHAN_BODY_SIZE, ERHAN_ROW } from "@/lib/pdf/templates/erhan-excel/erhan-excel.styles";

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

export const FIXTURES: Record<string, DocumentPreview> = {
  "single-vat": preview([
    line(1, "Mauer, Trockenbau und Fliesenarbeiten", 1, "pausch", 200_000, 19, "im Bad inkl. Material"),
  ]),
  "business-contact": preview([line(1, "Malerarbeiten", 1, "pausch", 68_000, 19)], {
    customer: { ...customer, customer_type: "business", company_name: "Schneider Hausverwaltung GmbH" },
  }),
  "business-no-contact": preview([line(1, "Malerarbeiten", 1, "pausch", 68_000, 19)], {
    customer: {
      ...customer, customer_type: "business", company_name: "Schneider Hausverwaltung GmbH",
      firstname: null, lastname: null,
    },
  }),
  "large-amounts": preview([
    line(1, "Sanierungsarbeiten", 10, "Pauschale", 12_345_678, 19),
    line(2, "Anfahrt", 1, "pausch", 5_000, 19),
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

export interface PdfText { str: string; x: number; width: number; baseline: number; size: number; fontName: string }

export async function renderPages(name: string): Promise<{ pages: PdfText[][]; sizes: number[][] }> {
  const buffer = await renderDocumentPdfBuffer(FIXTURES[name], null);
  const visualFixtures = process.env.PDF_VISUAL_FIXTURE?.split(",") ?? [];
  if (visualFixtures.includes("1") || visualFixtures.includes(name)) {
    const directory = process.env.PDF_VISUAL_OUTPUT_DIR ?? path.join(process.cwd(), "output", "pdf");
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
        ? [{ str: item.str, x: item.transform[4], width: item.width, baseline: page.view[3] - item.transform[5], size: item.transform[0], fontName: item.fontName }]
        : [])));
    }
    return { pages, sizes };
  } finally {
    await task.destroy();
  }
}

export const text = (page: PdfText[]) => page.map((item) => item.str).join(" ");

export function collisions(page: PdfText[]): string[] {
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

/** Beschreibungstext bleibt nach Umbrüchen auf den geplanten Grundlinien. */
export function offGrid(page: PdfText[], rowsTop: number): string[] {
  return page
    .filter((item) => item.size === ERHAN_BODY_SIZE && item.x > ERHAN_COLUMNS[1]
      && item.x < ERHAN_COLUMNS[2] && item.baseline >= rowsTop)
    .filter((item) => {
      const offset = (((item.baseline - rowsTop) % ERHAN_ROW) + ERHAN_ROW) % ERHAN_ROW;
      return Math.abs(offset - ERHAN_BODY_SIZE) > 0.6;
    })
    .map((item) => item.str + '@' + item.baseline.toFixed(2));
}
