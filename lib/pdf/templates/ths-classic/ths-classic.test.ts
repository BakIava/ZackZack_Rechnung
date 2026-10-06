import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { describe, expect, it } from "vitest";
import { calculateDocumentTotals, calculateLineAmounts } from "@/lib/documents/tax";
import { renderDocumentPdfBuffer } from "@/lib/pdf/render-document";
import type { DocumentItem, DocumentPreview, TaxRate } from "@/types/document";

/** Künstliche Beispieldaten — keine echten Firmen-, Kunden- oder Belegwerte. */
const company: DocumentPreview["company"] = {
  name: "Technik Hilfe Sander", legalForm: "Einzelunternehmen",
  street: "Am Mühlbach", streetNo: "51", postcode: "55257", city: "Musterstadt",
  phone: null, mobile: "0151 – 23 45 678", website: null, fax: null, email: "info@technik-hilfe.example",
  director: "Tarik Sander", steuernummer: null, ustId: "DE123456789",
  bankName: null, iban: "DE02 1203 0000 0000 2020 51", bic: "BYLADEM1001",
  accountHolder: null, logoUrl: null, paymentDays: 14,
};

const businessCustomer: NonNullable<DocumentPreview["customer"]> = {
  customer_type: "business", firstname: null, lastname: null,
  company_name: "Muster Facility GmbH", street: "Energieweg", streetNo: "1",
  postcode: "55286", city: "Musterdorf", email: null, phone: null,
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
    id: "ths-fixture", docType: "invoice", status: "finalized", documentNumber: "R-2026-041",
    issueDate: "2026-06-09", serviceDate: "2026-06-05", servicePeriodStart: null,
    servicePeriodEnd: null, validUntil: null, isKleinunternehmer: false, defaultTaxRate: 19,
    netAmount: totals.netAmount, taxAmount: totals.taxAmount, totalAmount: totals.grossAmount,
    taxGroups: totals.taxGroups, company, customer: businessCustomer, items,
    convertedInvoiceId: null, basedOnQuoteId: null,
    template: { id: "ths-classic", version: 1 },
    ...overrides,
  };
}

const kleinunternehmer: Partial<DocumentPreview> = { isKleinunternehmer: true, defaultTaxRate: 0 };

function manyItems(count: number, rate: (index: number) => TaxRate, text = "Montage und Prüfung"): DocumentItem[] {
  return Array.from({ length: count }, (_, index) => line(
    index + 1, `Leistungsposition ${index + 1}: ${text}`,
    index % 3 === 0 ? 1.5 : 2, index % 4 === 0 ? "Pauschale" : "Std.",
    3_900 + index * 125, rate(index),
  ));
}

const FIXTURES: Record<string, DocumentPreview> = {
  "one-line-vat": preview([line(1, "Geb. 12 A, Aufzug Kabel erneuert", 2, "Std.", 3_900, 19)]),
  "one-line-k19": preview([line(1, "Fensterbeschlag nachgestellt", 1, "psch", 8_500, 0)], kleinunternehmer),
  "many-mixed-vat": preview(manyItems(42, (index) => (index % 5 === 0 ? 7 : 19))),
  "many-k19-caps": preview(
    manyItems(36, () => 0, "WARTUNG BRANDSCHUTZTÜR TREPPENHAUS OST GEBÄUDE ZWÖLF"),
    kleinunternehmer,
  ),
  "long-names": preview([
    line(1, "Austausch und Neueinstellung sämtlicher Fenster- und Türbeschläge im Treppenhaus inklusive Brandschutzprüfung", 12.5, "Pauschale", 1_234_567, 19, "Inklusive Anfahrt, Material und Entsorgung.\nAbnahme mit dem Hausmeister vor Ort."),
    line(2, "Brandschutztürenwartungsvertragsverlängerungsarbeiten", 1, "psch", 9_900, 7),
  ], {
    customer: {
      ...businessCustomer,
      company_name: "Gemeinnützige Wohnungsbaugesellschaft Rheinhessen-Nahe Gebäude- und Projektmanagement mbH",
      firstname: "Maximilian-Alexander Konstantin", lastname: "Mustermann-Schneiderhausen",
      phone: "+49 6131 000000 / Durchwahl 123",
    },
    company: {
      ...company,
      name: "Technische Hilfe Sander Brandschutz- und Türtechnik Meisterbetrieb",
      director: "Tarik Sander-Abdulrahman von Musterhausen",
    },
  }),
  "contact-and-phone": preview([line(1, "Türschließer eingestellt", 2, "Std.", 3_900, 19)], {
    customer: { ...businessCustomer, firstname: "Max", lastname: "Mustermann", phone: "06131 000000" },
    serviceDate: null, servicePeriodStart: "2026-08-03", servicePeriodEnd: "2026-08-08",
  }),
  "private-phone": preview([line(1, "Jalousie repariert", 1, "psch", 8_500, 19)], {
    customer: {
      customer_type: "private", firstname: "Familie", lastname: "Schneider", company_name: null,
      street: "Gartenweg", streetNo: "4", postcode: "55116", city: "Musterstadt",
      email: null, phone: "0171 2345678",
    },
  }),
  "k19-long-description": preview([
    line(1, "Sanierung Türanlage", 1, "psch", 480_000, 0, Array.from({ length: 60 }, (_, index) =>
      `Arbeitsschritt ${index + 1}: Demontage, Reinigung und fachgerechte Wiedermontage der Beschläge.`).join("\n")),
    line(2, "Abschlussprüfung", 2, "Std.", 3_900, 0),
  ], kleinunternehmer),
  "service-location": preview([line(1, "Aufzugarbeiten", 2, "Std.", 3_900, 19)], {
    serviceLocation: {
      name: "Muster Pharma Campus", street: "Industriestraße", houseNumber: "173",
      postcode: "55216", city: "Musterheim", addressExtra: "",
    },
  }),
  "service-location-long": preview([line(1, "Aufzugarbeiten", 2, "Std.", 3_900, 19)], {
    customer: { ...businessCustomer, firstname: "Max", lastname: "Mustermann", phone: "06131 000000" },
    serviceLocation: {
      name: "Gemeinnützige Wohnungsbaugesellschaft Rheinhessen-Nahe Gebäudemanagement mbH",
      street: "Industriestraßenverlängerung", houseNumber: "173a",
      postcode: "55216", city: "Musterheim am Rhein",
      addressExtra: "Gebäude 12 A, Hintereingang über den Parkplatz Nord, 3. Obergeschoss, Technikraum links neben dem Aufzug",
    },
  }),
  "quote-k19": preview(
    [line(1, "Jalousie reparieren", 3, "Stk.", 6_500, 0), line(2, "Anfahrt", 1, "psch", 3_500, 0)],
    { ...kleinunternehmer, docType: "quote", documentNumber: "A-2026-088", validUntil: "2026-07-09", serviceDate: null },
  ),
};

interface PdfText { str: string; x: number; width: number; baseline: number; size: number }

async function renderPages(
  name: string,
  input: DocumentPreview = FIXTURES[name],
): Promise<{ pages: PdfText[][]; sizes: number[][] }> {
  const buffer = await renderDocumentPdfBuffer(input, null);
  if (process.env.PDF_VISUAL_FIXTURE === "1") {
    const directory = path.join(process.cwd(), "output", "pdf");
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, `ths-classic-${name}.pdf`), buffer);
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

const FOOTER_TOP = 741;
const FOOTER_SIZE = 7.25;
const text = (page: PdfText[]) => page.map((item) => item.str).join(" ");

/** Erwartet den Zeilenanfang genau einmal und an Spalte/Grundlinie (± 0,1 pt). */
function expectAt(page: PdfText[], label: string, x: number, baseline: number) {
  const found = page.filter((item) => item.str.startsWith(label));
  expect(found, label).toHaveLength(1);
  expect(found[0].x, `${label} x`).toBeCloseTo(x, 1);
  expect(found[0].baseline, `${label} Grundlinie`).toBeCloseTo(baseline, 1);
}

/** Paarweise Überschneidung der Glyphenboxen (Versalhöhe bis Unterlänge, falls vorhanden). */
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

describe("ths-classic – Seitenaufbau", () => {
  it.each(Object.keys(FIXTURES))("%s: A4, keine überlappenden Texte, nichts unter dem Footer", async (name) => {
    const { pages, sizes } = await renderPages(name);
    for (const [width, height] of sizes) {
      expect(width).toBeCloseTo(595.28, 1);
      expect(height).toBeCloseTo(841.89, 1);
    }
    pages.forEach((page, index) => {
      expect(collisions(page)).toEqual([]);
      const contentInFooter = page.filter((item) =>
        item.baseline + item.size * 0.2 > FOOTER_TOP - 2 && Math.abs(item.size - FOOTER_SIZE) > 0.01);
      expect(contentInFooter).toEqual([]);
      expect(text(page)).toContain(`Seite ${index + 1} von ${pages.length}`);
      // Firmenname im Kopfband jeder Seite (bei Überlänge mit Auslassung gekürzt).
      expect(text(page)).toContain(FIXTURES[name].company.name.slice(0, 12));
      expect(text(page)).toContain("G-Preis - € -");
    });
    const all = pages.map(text).join(" ").toLowerCase();
    expect(all).not.toMatch(/purchase|surcharge|einkauf|marge|aufschlag/);
  }, 60_000);

  it("einzeilige Rechnung mit 19 %: eine Seite, Netto/MwSt./Brutto, kein §19-Hinweis", async () => {
    const { pages } = await renderPages("one-line-vat");
    expect(pages).toHaveLength(1);
    const page = text(pages[0]);
    for (const expected of [
      "Rechnungsnummer: R-2026-041", "Belegdatum:", "Liefer-/Montagetermin: 05.06.2026",
      "Gemäß Auftrag berechnen wir Ihnen wie folgt:", "Firma", "Muster Facility GmbH",
      "Summe Netto", "78,00", "Mehrwertsteuer", "19,00%", "14,82", "Summe Brutto", "92,82",
      "Zahlungsbedingung:", "Mit freundlichen Grüßen", "Geschäftsführer:", "USt-IdNr.:",
    ]) {
      expect(page).toContain(expected);
    }
    expect(page).not.toContain("§ 19");
  }, 60_000);

  it("§19: Endbetrag ohne Steuerausweis und exakter §19-Hinweis", async () => {
    const page = text((await renderPages("one-line-k19")).pages[0]);
    expect(page).toContain("Rechnungsbetrag");
    expect(page).toContain("Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.");
    expect(page).not.toContain("Mehrwertsteuer");
    expect(page).not.toContain("USt.");
  }, 60_000);

  it("Angebot: Gültigkeit statt Zahlungsbedingung", async () => {
    const page = text((await renderPages("quote-k19")).pages[0]);
    expect(page).toContain("Angebotsnummer: A-2026-088");
    expect(page).toContain("Gültig bis: 09.07.2026");
    expect(page).toContain("Gerne bieten wir Ihnen wie folgt an:");
    expect(page).toContain("Angebotssumme");
    expect(page).not.toContain("Zahlungsbedingung");
  }, 60_000);

  it("viele Positionen laufen über Seiten: jede Position genau einmal, Zwischensummen, Summen nur am Ende", async () => {
    const { pages } = await renderPages("many-mixed-vat");
    expect(pages.length).toBeGreaterThan(1);
    const all = pages.map(text).join(" ");
    for (let index = 1; index <= 42; index += 1) {
      expect(all.match(new RegExp(`Leistungsposition ${index}:`, "g"))).toHaveLength(1);
    }
    pages.slice(0, -1).forEach((page) => {
      expect(text(page)).toContain("Zwischensumme (netto)");
      expect(text(page)).not.toContain("Summe Brutto");
    });
    const last = text(pages.at(-1)!);
    expect(last).toContain("Summe Brutto");
    expect(last).toContain("7,00%");
    expect(last).toContain("19,00%");
    expect(text(pages[1])).toContain("Rechnungsnummer: R-2026-041");
    for (const firstPageOnly of ["Belegdatum:", "Sachbearbeiter:", "Liefer-/Montagetermin:"]) {
      expect(text(pages[1])).not.toContain(firstPageOnly);
    }
  }, 60_000);

  it("lange Beschreibung wird über Folgeseiten fortgesetzt, ohne Zeilen zu verlieren", async () => {
    const { pages } = await renderPages("k19-long-description");
    expect(pages.length).toBeGreaterThan(2);
    const all = pages.map(text).join(" ");
    for (let index = 1; index <= 60; index += 1) {
      expect(all).toContain(`Arbeitsschritt ${index}:`);
    }
    expect(text(pages.at(-1)!)).toContain("Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.");
  }, 60_000);

  it("Kopf wie Referenz: Sachbearbeiter unter dem Belegdatum, Ansprechpartner/Tel./Termin unter der Nummer", async () => {
    const page = (await renderPages("contact-and-phone")).pages[0];
    for (const expected of [
      "Sachbearbeiter: Tarik Sander", "Rechnungsnummer: R-2026-041",
      "Ansprechpartner: Max Mustermann", "Tel.: 06131 000000",
      "Liefer-/Montagetermin: 03.08.2026 – 08.08.2026",
    ]) {
      expect(text(page)).toContain(expected);
    }
    expectAt(page, "Belegdatum:", 439.6, 216.9);
    expectAt(page, "Sachbearbeiter:", 439.6, 232.7);
    expectAt(page, "Rechnungsnummer:", 70.8, 270);
    expectAt(page, "Ansprechpartner:", 70.8, 286);
    expectAt(page, "Tel.:", 70.8, 301);
    expectAt(page, "Liefer-/Montagetermin:", 70.8, 316);
  }, 60_000);

  it("Privatkunde: Telefon ja, Ansprechpartner nein — die Zeilen rücken nach", async () => {
    const page = (await renderPages("private-phone")).pages[0];
    expect(text(page)).not.toContain("Ansprechpartner");
    expect(text(page)).toContain("Tel.: 0171 2345678");
    expectAt(page, "Tel.:", 70.8, 286);
    expectAt(page, "Liefer-/Montagetermin:", 70.8, 301);
  }, 60_000);

  it("ohne Ansprechpartner und Telefon steht der Termin direkt unter der Nummer", async () => {
    const page = (await renderPages("one-line-vat")).pages[0];
    expect(text(page)).not.toContain("Ansprechpartner");
    expect(text(page)).not.toContain("Tel.:");
    expectAt(page, "Liefer-/Montagetermin:", 70.8, 286);
  }, 60_000);

  it("Angebot: Sachbearbeiter unter „Gültig bis“; ohne Geschäftsführer entfällt die Zeile", async () => {
    const quote = (await renderPages("quote-k19")).pages[0];
    expectAt(quote, "Gültig bis:", 439.6, 232.7);
    expectAt(quote, "Sachbearbeiter:", 439.6, 248.5);

    const withoutDirector = (await renderPages("no-director", {
      ...FIXTURES["one-line-vat"], company: { ...company, director: null },
    })).pages[0];
    expect(text(withoutDirector)).not.toContain("Sachbearbeiter");
    expect(text(withoutDirector)).not.toContain("Geschäftsführer");
  }, 60_000);

  it("Einsatzort steht wie die Lieferadresse der Referenz rechts neben der Anschrift", async () => {
    const page = (await renderPages("service-location")).pages[0];
    expectAt(page, "Einsatzort:", 354.4, 148.5);
    expectAt(page, "Muster Pharma Campus", 354.4, 162.5);
    expectAt(page, "Industriestraße 173", 354.4, 176.6);
    expectAt(page, "55216 Musterheim", 354.4, 190.6);
    expect(text(page)).not.toContain("Lieferadresse");

    const without = text((await renderPages("one-line-vat")).pages[0]);
    expect(without).not.toContain("Einsatzort");
  }, 60_000);

  it("langer Einsatzort endet über dem Belegdatum", async () => {
    const page = (await renderPages("service-location-long")).pages[0];
    const block = page.filter((item) => item.x >= 354 && item.x < 439 && item.baseline < 216);
    expect(block.length).toBeGreaterThan(0);
    const metaTop = 216.9 - 9.25;
    for (const item of page.filter((entry) => entry.x >= 354 && entry.baseline < 216.9 - 1)) {
      expect(item.baseline + item.size * 0.2, item.str).toBeLessThan(metaTop);
    }
    expectAt(page, "Belegdatum:", 439.6, 216.9);
  }, 60_000);

  it("lange Namen bleiben vollständig lesbar", async () => {
    const all = (await renderPages("long-names")).pages.map(text).join(" ");
    expect(all).toContain("Gemeinnützige Wohnungsbaugesellschaft");
    expect(all).toContain("Projektmanagement mbH");
    expect(all).toContain("Technische Hilfe Sander Brandschutz- und Türtechnik Meisterbetrieb");
    expect(all).toContain("Maximilian-Alexander Konstantin Mustermann-Schneiderhausen");
    expect(all).toContain("+49 6131 000000 / Durchwahl 123");
    expect(all).toMatch(/Tarik Sander-\s?Abdulrahman von\s+Musterhausen/);
    expect(all).toContain("154.320,88");
  }, 60_000);
});
