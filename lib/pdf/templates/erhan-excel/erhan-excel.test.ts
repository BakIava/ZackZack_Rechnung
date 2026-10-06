import { readFile } from "node:fs/promises";
import path from "node:path";
import { getDocument, OPS } from "pdfjs-dist/legacy/build/pdf.mjs";
import { describe, expect, it } from "vitest";
import { renderDocumentPdfBuffer } from "@/lib/pdf/render-document";
import { buildDocumentRenderData } from "@/lib/pdf/render-data";
import { FIXTURES, renderPages, text, collisions, offGrid, type PdfText } from "@/lib/pdf/test-support/erhan-excel";
import { ERHAN_LOGO_CENTER_X, erhanFirstPageShift } from "./erhan-excel-layout";
import { ERHAN_LOGO_DATA_URL } from "./erhan-excel-logo";
import { ERHAN_BODY_SIZE, ERHAN_COLUMNS, ERHAN_GEOMETRY, FOOTER_SIZE } from "./erhan-excel.styles";

describe("erhan-excel – Seitenaufbau", () => {
  it("große Beträge bleiben vollständig in einer Zeile und verschieben keine Folgeposition", async () => {
    const page = (await renderPages("large-amounts")).pages[0];
    const amount = page.find((item) => item.str === "1.234.567,80 €")!;
    const first = page.find((item) => item.str === "Sanierungsarbeiten")!;
    const next = page.find((item) => item.str === "Anfahrt")!;
    expect(amount).toBeDefined();
    expect(amount.baseline).toBeCloseTo(first.baseline, 1);
    expect(next.baseline - first.baseline).toBeCloseTo(15, 1);
    expect(amount.x + amount.width).toBeLessThan(ERHAN_COLUMNS.at(-1)!);
  }, 60_000);

  it("vergrößert nur den Inhalt unter dem Titel auf 12 pt und den Footer auf 9 pt", async () => {
    const page = (await renderPages("single-vat")).pages[0];
    const body = page.filter((item) => item.baseline > ERHAN_GEOMETRY.titleBaseline
      && item.baseline < ERHAN_GEOMETRY.footerBaselines[0] - FOOTER_SIZE);
    expect(body.length).toBeGreaterThan(15);
    expect(body.every((item) => Math.abs(item.size - 12) < 0.01)).toBe(true);
    expect(page.find((item) => item.str === "Rechnung")?.size).toBe(16);
    expect(page.find((item) => item.str === "Jonas Beispiel")?.size).toBe(12);
    expect(page.find((item) => item.str.includes("Fliesenfachbetrieb MUSTER") && item.baseline < 200)?.size).toBe(7);
  }, 60_000);

  it.each([
    ["business-contact", ["Jonas Beispiel", "Schneider Hausverwaltung GmbH", "Lindenstr. 1", "55262 Ingelheim"]],
    ["business-no-contact", ["Schneider Hausverwaltung GmbH", "Lindenstr. 1", "55262 Ingelheim"]],
    ["single-vat", ["Jonas Beispiel", "Lindenstr. 1", "55262 Ingelheim"]],
  ] as const)("%s: Kontaktperson steht über der Firma, ohne Leerzeilen oder doppelte Namen", async (name, expected) => {
    const page = (await renderPages(name)).pages[0];
    const recipient = page.filter((item) =>
      Math.abs(item.x - ERHAN_GEOMETRY.left) < 0.5
      && item.baseline >= ERHAN_GEOMETRY.recipientBaseline - 0.5
      && item.baseline < ERHAN_GEOMETRY.titleBaseline - 20);
    expect(recipient.map((item) => item.str)).toEqual(expected);
    recipient.forEach((item, index) => {
      expect(item.baseline).toBeCloseTo(
        ERHAN_GEOMETRY.recipientBaseline + index * ERHAN_GEOMETRY.recipientLineHeight, 0,
      );
    });
  }, 60_000);

  it.each(Object.keys(FIXTURES))("%s: A4, Raster, keine Überlappung, nichts im Fußbereich", async (name) => {
    const { pages, sizes } = await renderPages(name);
    for (const [width, height] of sizes) {
      expect(width).toBeCloseTo(595.28, 1);
      expect(height).toBeCloseTo(841.89, 1);
    }
    pages.forEach((page, index) => {
      expect(collisions(page)).toEqual([]);
      const shift = erhanFirstPageShift(buildDocumentRenderData(FIXTURES[name], null));
      expect(offGrid(page, index === 0 ? ERHAN_GEOMETRY.firstRowsTop + shift : ERHAN_GEOMETRY.continuationRowsTop)).toEqual([]);
      const contentBelowGrid = page.filter((item) =>
        item.baseline > ERHAN_GEOMETRY.gridBottom + 2 && item.size > FOOTER_SIZE + 0.01);
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
      // Sämtliche Texte und die Summenlinie sind schwarz; das Logo bleibt als Bild erhalten.
      const fills = fnArray.flatMap((fn, index) => (fn === OPS.setFillRGBColor ? [argsArray[index][0]] : []));
      expect(fills.length).toBeGreaterThan(0);
      expect(new Set(fills)).toEqual(new Set(["#000000"]));
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
    expect(new Set(footer.map((item) => Math.round(item.baseline)))).toEqual(new Set([788, 800, 812]));
    expect(footer.every((item) => Math.abs(item.size - FOOTER_SIZE) < 0.01)).toBe(true);
    const iban = footer.find((item) => item.str.startsWith("IBAN:"))!;
    const title = page.find((item) => item.str === "Rechnung")!;
    const bank = footer.find((item) => item.str === "Volksbank Musterland")!;
    expect(iban.fontName).toBe(title.fontName);
    expect(iban.fontName).not.toBe(bank.fontName);
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
    expect(all.match(/Pauschale/g)).toHaveLength(26);
    expect(text(pages[1])).toContain("Rechnungs-Nr. R-2026-005");
    expect(text(pages[1])).not.toContain("Tel.:");
  }, 60_000);

  it("lange Beschreibungen laufen über Seiten, ohne Zeilen zu verlieren", async () => {
    const { pages } = await renderPages("long-description");
    expect(pages.length).toBeGreaterThan(2);
    // Fortlaufender Text der Spalte „Leistung-Material“ über alle Seiten.
    const column = pages
      .flatMap((page) => page.filter((item) => item.size === ERHAN_BODY_SIZE
        && item.x > ERHAN_COLUMNS[1] && item.x < ERHAN_COLUMNS[2] && item.baseline > 100))
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

  it.each([
    ["single-vat", "Ingelheim, den 06.04.2026"],
    ["caps-and-compounds", "Ingelheim am Rhein, den 06.04.2026"],
  ])("%s: „Ort, den Datum“ bleibt einzeilig in 11 pt", async (fixture, expected) => {
    const page = (await renderPages(fixture)).pages[0];
    const dateLine = page.filter((item) => Math.abs(item.baseline - 213.75) < 0.5);
    expect(text(dateLine)).toBe(expected);
    expect(dateLine.every((item) => Math.abs(item.size - 11) < 0.01)).toBe(true);
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
