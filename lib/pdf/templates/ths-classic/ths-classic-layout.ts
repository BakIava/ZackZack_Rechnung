/**
 * Seitenplanung der Vorlage `ths-classic`: Höhenbudgets aus der Referenzgeometrie
 * und eine dokumentabhängige Reserve für Summen, Rechtshinweis, Zahlungsbedingung
 * und Grußformel. Reine Layout-Arithmetik — Beträge, Sätze und Texte kommen
 * fertig aus den Renderdaten.
 */

import type { DocumentRenderData, RenderItem } from "@/lib/pdf/render-data";
import { wrapPdfCellText, type PdfPageMetrics } from "@/lib/pdf/document-pages";
import { THS_GEOMETRY } from "./ths-classic.styles";

const T = THS_GEOMETRY.table;
const C = THS_GEOMETRY.closing;

/** Zeichen-Einheiten je Zeile (Hanken Grotesk ≈ 0,62 em je Einheit, konservativ). */
export const THS_UNITS = {
  menge: 7,
  name: { withTax: 26, withoutTax: 36 },
  description: { withTax: 30, withoutTax: 42 },
  note: 80,
  terms: 85,
} as const;

const HEAD_HEIGHT = T.headRule + T.headHeight + T.headRule;
const SUMMARY_ROW_HEIGHT = T.summaryRule + T.summaryHeight;
/** Zwischensummen-Zeile am Ende jeder Nicht-Schlussseite. */
const SUBTOTAL_RESERVE = T.gapBeforeSummary + SUMMARY_ROW_HEIGHT;
const LINE = 14;

const LONG_WORD = 18;
const WORD_CHUNK = 8;

/**
 * Silbentrennungs-Callback für freie Texte: überlange Wörter (z. B. deutsche
 * Komposita) dürfen in 8-Zeichen-Stücken umbrechen, statt über die Spalte in
 * Preis- oder Steuerspalten zu laufen. Die Seitenplanung (`wrapPdfCellText`)
 * teilt überlange Wörter ebenso. Normale Wörter bleiben ungetrennt.
 */
export function breakLongWords(word: string): string[] {
  const chars = Array.from(word);
  if (chars.length <= LONG_WORD) return [word];
  const parts: string[] = [];
  for (let index = 0; index < chars.length; index += WORD_CHUNK) {
    parts.push(chars.slice(index, index + WORD_CHUNK).join(""));
  }
  return parts;
}

export type ThsRow = RenderItem & { minNameLines: number };

/** Positionen samt Mindestzeilen, falls die schmale Mengen-Zelle umbricht. */
export function buildThsRows(data: DocumentRenderData): ThsRow[] {
  return data.items.map((item) => ({
    ...item,
    minNameLines: wrapPdfCellText(item.quantityText, THS_UNITS.menge).length,
  }));
}

/** Anzahl der Summenzeilen: §19 ohne Steuerausweis nur der Endbetrag. */
export function thsSummaryRowCount(data: DocumentRenderData): number {
  return data.tax.showTaxDetails ? 2 + data.totals.taxGroups.length : 1;
}

/** Höhe von Summenblock bis Firmenname auf der Schlussseite. */
export function thsClosingHeight(data: DocumentRenderData): number {
  const summary = T.gapBeforeSummary + thsSummaryRowCount(data) * SUMMARY_ROW_HEIGHT;
  const note = data.tax.showKleinunternehmerHinweis
    ? C.noteGap + wrapPdfCellText(data.tax.kleinunternehmerHinweis, THS_UNITS.note).length * C.noteLineHeight
    : 0;
  const payment = data.payment.termsText
    ? C.blockGap + LINE
      + C.blockGap + wrapPdfCellText(data.payment.termsText, THS_UNITS.terms).length * C.termsLineHeight
    : 0;
  const greeting = 2 * (C.blockGap + LINE);
  return summary + note + payment + greeting + 6;
}

export function thsPageMetrics(data: DocumentRenderData): PdfPageMetrics {
  const firstRowsTop = THS_GEOMETRY.tableTop + HEAD_HEIGHT;
  const continuationRowsTop = THS_GEOMETRY.continuationTableTop + HEAD_HEIGHT;
  return {
    firstPageRowHeight: THS_GEOMETRY.contentBottom - firstRowsTop - SUBTOTAL_RESERVE,
    continuationPageRowHeight:
      THS_GEOMETRY.contentBottom - continuationRowsTop - SUBTOTAL_RESERVE,
    summaryHeight: thsClosingHeight(data),
    rowPadding: 0,
    nameLineHeight: T.rowLineHeight,
    descriptionLineHeight: 11,
    descriptionGap: 1,
    nameWidthUnits: THS_UNITS.name,
    descriptionWidthUnits: THS_UNITS.description,
  };
}
