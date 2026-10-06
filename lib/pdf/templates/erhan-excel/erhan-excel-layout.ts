/**
 * Seitenplanung der Vorlage `erhan-excel`: alles liegt auf dem Excel-Zeilenraster
 * (12,75 pt). Positionszeilen belegen ganze Rasterzeilen; die Summen sitzen auf
 * der Schlussseite fest unten rechts, der Raum dazwischen bleibt als leeres
 * Raster stehen — wie im Excel-Original. Reine Layout-Arithmetik.
 */

import type { DocumentRenderData, RenderItem } from "@/lib/pdf/render-data";
import type { PdfPageMetrics } from "@/lib/pdf/document-pages";
import { measureText, wrapTextToWidth, type FontWeightName } from "@/lib/pdf/text-metrics";
import { joinText } from "@/lib/pdf/join-text";
import { ERHAN_LOGO_SIZE } from "./erhan-excel-logo";
import { ERHAN_COLUMNS, ERHAN_GEOMETRY, ERHAN_ROW } from "./erhan-excel.styles";

const G = ERHAN_GEOMETRY;

/**
 * Nutzbare Textbreiten (Spalte minus 2 × 2,5 pt Zellabstand minus 1 pt Reserve).
 * Zellen werden vorab exakt umbrochen (lib/pdf/text-metrics.ts), damit jede
 * Zeile genau eine Rasterzeile belegt und React-PDF nie selbst umbricht.
 */
const [, B, C, D, E] = ERHAN_COLUMNS;
export const ERHAN_TEXT_WIDTH = { leistung: C - B - 6, art: E - D - 6 } as const;
const FONT_SIZE = 10;
/** Die Seitenplanung zählt nur noch die vorab gesetzten Zeilenumbrüche. */
const NO_REWRAP = 100_000;

/** Letzte Rasterzeile vor der Zwischensumme bzw. Unterkante des Positionsbereichs. */
const ROWS_BOTTOM = G.gridBottom - ERHAN_ROW;

export interface ErhanLocationLine {
  text: string;
  isName: boolean;
}

/** Name, Adresse und Zusatz haben eigene Zeilen mit demselben hängenden Einzug. */
export function erhanServiceLocationLines(data: DocumentRenderData): ErhanLocationLine[] {
  const location = data.serviceLocation;
  if (!location) return [];
  const address = joinText([location.street, location.houseNumber], " ");
  const city = joinText([location.postcode, location.city], " ");
  const addressLine = [address, city].filter(Boolean).join(", ");
  const width = ERHAN_COLUMNS.at(-1)! - G.left - G.locationIndent - 5;
  const wrap = (value: string, isName: boolean): ErhanLocationLine[] => value
    ? wrapTextToWidth(value, width, 10, isName ? "bold" : "regular")
      .map((text) => ({ text, isName }))
    : [];
  return [
    ...wrap(location.name, true),
    ...wrap(addressLine, false),
    ...wrap(location.addressExtra, false),
  ];
}

export function erhanFirstPageShift(data: DocumentRenderData): number {
  return Math.max(0, erhanServiceLocationLines(data).length - 2) * ERHAN_ROW;
}

export type ErhanRow = RenderItem & { minNameLines: number; artText: string };

/** Mehrere Steuersätze: Satz je Position unter der Einheit (§ 14 Abs. 4 Nr. 8 UStG). */
export function showsLineRates(data: DocumentRenderData): boolean {
  return data.tax.showTaxDetails && data.totals.taxGroups.length > 1;
}

/** Positionen mit exakt vorab umbrochener Bezeichnung, Beschreibung und Einheit. */
export function buildErhanRows(data: DocumentRenderData): ErhanRow[] {
  const lineRates = showsLineRates(data);
  const wrap = (text: string, width: number) => wrapTextToWidth(text, width, FONT_SIZE);
  return data.items.map((item) => {
    const nameLines = wrap(item.descriptionDe, ERHAN_TEXT_WIDTH.leistung);
    const artLines = wrap(
      lineRates ? `${item.unit}\n${item.taxRateText}` : item.unit,
      ERHAN_TEXT_WIDTH.art,
    );
    return {
      ...item,
      descriptionDe: nameLines.join("\n"),
      additionalDescriptionDe: item.additionalDescriptionDe === null
        ? null
        : wrap(item.additionalDescriptionDe, ERHAN_TEXT_WIDTH.leistung).join("\n"),
      artText: artLines.join("\n"),
      minNameLines: Math.max(nameLines.length, artLines.length),
    };
  });
}

/** Rasterzeilen des Summenblocks: Netto + MwSt. je Satz (nur bei Steuerausweis), Leerzeile, Gesamt. */
export function erhanTotalsRowCount(data: DocumentRenderData): number {
  const taxRows = data.tax.showTaxDetails ? 1 + data.totals.taxGroups.length : 0;
  return taxRows + 2;
}

export function erhanTotalsTop(data: DocumentRenderData): number {
  return G.totalsBottom - erhanTotalsRowCount(data) * ERHAN_ROW;
}

export function erhanPageMetrics(data: DocumentRenderData): PdfPageMetrics {
  // Schlussseite: Positionen enden mindestens eine Leerzeile über den Summen.
  const summaryHeight = ROWS_BOTTOM - (erhanTotalsTop(data) - ERHAN_ROW);
  return {
    firstPageRowHeight: ROWS_BOTTOM - G.firstRowsTop - erhanFirstPageShift(data),
    continuationPageRowHeight: ROWS_BOTTOM - G.continuationRowsTop,
    summaryHeight,
    rowPadding: 0,
    nameLineHeight: ERHAN_ROW,
    descriptionLineHeight: ERHAN_ROW,
    descriptionGap: 0,
    nameWidthUnits: { withTax: NO_REWRAP, withoutTax: NO_REWRAP },
    descriptionWidthUnits: { withTax: NO_REWRAP, withoutTax: NO_REWRAP },
  };
}

const DATE_SIZE = 12;
/** Rechte Kante des Empfängerblocks — weiter nach links rückt die Ortszeile nicht. */
const DATE_MIN_X = G.contactLabelX - 30;

/**
 * Lage der einzeiligen Zeile „Ort, den Datum“: ab der Excel-Position, bei langen
 * Ortsnamen nach links gerückt, bis sie an der Kante der Kontaktwerte endet;
 * erst wenn auch das nicht reicht, wird die Schrift kleiner.
 */
export function erhanDateLine(text: string): { left: number; width: number; fontSize: number } {
  const right = G.contactValueRight;
  const needed = measureText(text, DATE_SIZE, "bold") + 1;
  const left = Math.max(DATE_MIN_X, Math.min(G.dateX, right - needed));
  const width = right - left;
  return { left, width, fontSize: fitMeasured(text, width, DATE_SIZE, "bold") };
}

/** Größter Schriftgrad ≤ `max` (in 0,25-pt-Schritten, mindestens 6 pt), mit dem `text` einzeilig in `width` passt. */
export function fitMeasured(text: string, width: number, max: number, weight: FontWeightName = "regular"): number {
  let fontSize = max;
  while (fontSize > 6 && measureText(text, fontSize, weight) + 1 > width) fontSize -= 0.25;
  return fontSize;
}

const CONTACT_SIZE = 12;
/** Abstand Beschriftung → Wert wie in der Referenz („E-Mail:“ passt mit Luft davor). */
const CONTACT_LABEL_GAP = G.contactValueX - G.contactLabelX;
/** Breiteste Wertspalte, bevor ein Wert (lange E-Mail) kleiner gesetzt wird. */
const CONTACT_VALUE_MAX = G.contactValueRight - G.contactValueX;
const LOGO_WIDTH = Math.min(G.logo.width, (G.logo.height * ERHAN_LOGO_SIZE.width) / ERHAN_LOGO_SIZE.height);
/** Mittelachse des gedruckten Logos (rechtsbündig in seiner Box). */
export const ERHAN_LOGO_CENTER_X = G.logo.left + G.logo.width - LOGO_WIDTH / 2;

export interface ErhanContactBlock {
  labelX: number;
  valueX: number;
  valueWidth: number;
  /** Schriftgrad je Wert, in derselben Reihenfolge wie `values`. */
  sizes: number[];
}

/**
 * Kontaktblock (Beschriftung + Wert) mittig unter dem Logo. Ein sehr breiter
 * Block rückt nach links, bis er an der Kante der Kontaktwerte endet — aber
 * nie in den Empfängerblock.
 */
export function erhanContactBlock(values: string[]): ErhanContactBlock {
  const sizes = values.map((value) => fitMeasured(value, CONTACT_VALUE_MAX, CONTACT_SIZE, "bold"));
  const widest = Math.max(0, ...values.map((value, index) => measureText(value, sizes[index], "bold") + 1));
  const blockWidth = CONTACT_LABEL_GAP + widest;
  const centered = ERHAN_LOGO_CENTER_X - blockWidth / 2;
  const labelX = Math.max(DATE_MIN_X, Math.min(centered, G.contactValueRight - blockWidth));
  const valueX = labelX + CONTACT_LABEL_GAP;
  return { labelX, valueX, valueWidth: G.contactValueRight - valueX, sizes };
}
