import { describe, expect, it } from "vitest";
import {
  calculatePageSubtotal,
  paginatePdfRows,
  PDF_A4_SIZE,
  wrapPdfCellText,
} from "./document-pages";
import type { PdfRow } from "./pdf-view-model";

function rows(count: number): PdfRow[] {
  return Array.from({ length: count }, (_, index) => ({
    position: index + 1,
    descriptionDe: `Position ${index + 1}`,
    additionalDescriptionDe: null,
    mengeText: "1 Stk.",
    unitPriceText: "10,00 €",
    totalAmount: (index + 1) * 1_000,
    totalText: "10,00 €",
    taxRateText: "",
  }));
}

describe("paginatePdfRows", () => {
  it("verwendet für jede Dokumentseite das physische DIN-A4-Format", () => {
    expect(PDF_A4_SIZE.width).toBeCloseTo(595.28, 2);
    expect(PDF_A4_SIZE.height).toBeCloseTo(841.89, 2);
    expect(PDF_A4_SIZE.height / PDF_A4_SIZE.width).toBeCloseTo(297 / 210, 3);
  });

  it("behält kurze Dokumente samt Zusammenfassung auf einer Seite", () => {
    expect(paginatePdfRows(rows(3))).toEqual([
      { rows: rows(3), isFirst: true, showSummary: true },
    ]);
  });

  it("berücksichtigt Zeilenhöhe statt nur die Positionszahl", () => {
    const shortPages = paginatePdfRows(rows(3));
    const longRows = rows(3);
    longRows[0].additionalDescriptionDe = "Sorgfältige Vorbereitung und Ausführung.\n".repeat(18);
    const longPages = paginatePdfRows(longRows);
    expect(shortPages).toHaveLength(1);
    expect(longPages.length).toBeGreaterThan(1);
    expect(longPages.flatMap((page) => page.rows).filter((row) => !row.isContinuation))
      .toHaveLength(3);
  });

  it("bewahrt absichtliche Zeilenumbrüche und fügt keine Ellipse ein", () => {
    const text = "Erste Zeile\nZweite Zeile\n\nVierte Zeile";
    expect(wrapPdfCellText(text, 46)).toEqual(["Erste Zeile", "Zweite Zeile", "", "Vierte Zeile"]);
    expect(wrapPdfCellText("W".repeat(200), 36).join("")).toBe("W".repeat(200));
  });

  it("verteilt eine unbegrenzte Einzelbeschreibung vollständig über mehrere Seiten", () => {
    const longText = Array.from({ length: 180 }, (_, index) => `Abschnitt ${index + 1}: Alle Arbeitsschritte werden ausgeführt.`).join("\n");
    const [row] = rows(1);
    row.additionalDescriptionDe = longText;
    const pages = paginatePdfRows([row]);
    expect(pages.length).toBeGreaterThan(3);
    const fragments = pages.flatMap((page) => page.rows);
    expect(fragments[0].isContinuation).toBeUndefined();
    expect(fragments.slice(1).every((fragment) => fragment.isContinuation)).toBe(true);
    expect(fragments.map((fragment) => fragment.additionalDescriptionDe ?? "").join("\n").replace(/\s/g, ""))
      .toBe(longText.replace(/\s/g, ""));
    expect(fragments.map((fragment) => fragment.additionalDescriptionDe).join(""))
      .not.toContain("…");
    expect(pages.map((page) => calculatePageSubtotal(page.rows)))
      .toEqual([row.totalAmount, ...Array.from({ length: pages.length - 1 }, () => 0)]);
    expect(pages.filter((page) => page.showSummary)).toHaveLength(1);
    expect(pages.at(-1)?.showSummary).toBe(true);
  });

  it("berechnet Zwischensummen nur aus den auf einer Seite beginnenden Positionen", () => {
    const input = rows(18);
    const pages = paginatePdfRows(input);
    const total = pages.reduce((sum, page) => sum + calculatePageSubtotal(page.rows), 0);
    expect(total).toBe(input.reduce((sum, row) => sum + row.totalAmount, 0));
    expect(pages.flatMap((page) => page.rows).map((row) => row.position))
      .toEqual(input.map((row) => row.position));
  });

  it("liefert auch ohne Positionen eine renderbare Seite", () => {
    expect(paginatePdfRows([])).toEqual([
      { rows: [], isFirst: true, showSummary: true },
    ]);
  });
});
