/**
 * Seitenplanung der Vorlage `erhan-excel`: alles liegt auf dem Excel-Zeilenraster
 * (12,75 pt). Positionszeilen belegen ganze Rasterzeilen; die Summen sitzen auf
 * der Schlussseite fest unten rechts, der Raum dazwischen bleibt als leeres
 * Raster stehen — wie im Excel-Original. Reine Layout-Arithmetik.
 */

import type { DocumentRenderData, RenderItem } from "@/lib/pdf/render-data";
import type { PdfPageMetrics } from "@/lib/pdf/document-pages";
import { wrapTextToWidth } from "@/lib/pdf/text-metrics";
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
    firstPageRowHeight: ROWS_BOTTOM - G.firstRowsTop,
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

/**
 * Schriftgrad, mit dem ein einzeiliger fetter Wert in `width` passt (≈ 0,55 em
 * je Zeichen, Hanken fett), zwischen `min` und `max` — für lange E-Mail-Adressen im Kontaktblock.
 */
export function fitFontSize(text: string, width: number, max: number, min = 8): number {
  const length = Array.from(text).length;
  if (length === 0) return max;
  return Math.max(min, Math.min(max, Math.floor((width / (length * 0.55)) * 4) / 4));
}
