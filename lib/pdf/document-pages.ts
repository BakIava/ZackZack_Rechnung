import { formatDecimal, formatMoney } from "@/lib/format";
import type { PdfRow } from "@/lib/pdf/pdf-view-model";

/** ISO 216 A4 in PostScript points (72 pt/in). */
export const PDF_A4_SIZE = { width: 595.28, height: 841.89 } as const;

/** Was die Seitenplanung von einer Zeile wissen muss — Standard-Zeile oder Renderdaten-Position. */
export interface PaginatableRow {
  descriptionDe: string;
  additionalDescriptionDe: string | null;
  /** Netto-Zeilensumme in Cent für seitenbezogene Zwischensummen. */
  totalAmount: number;
  /** Mindestzeilen des ersten Teils, z. B. wenn eine schmale Mengen-Zelle umbricht. */
  minNameLines?: number;
}

/**
 * Höhenbudget einer Vorlage in Punkten. Die Budgets enden oberhalb des festen
 * Footers; `summaryHeight` reserviert auf der Schlussseite Platz für Summen,
 * Steuerzeilen, Rechtshinweis und Zahlungsbedingungen.
 */
export interface PdfPageMetrics {
  firstPageRowHeight: number;
  continuationPageRowHeight: number;
  summaryHeight: number;
  rowPadding: number;
  nameLineHeight: number;
  descriptionLineHeight: number;
  descriptionGap: number;
  /** Zeichen-Einheiten je Zeile der Bezeichnung (mit / ohne USt.-Spalte). */
  nameWidthUnits: { withTax: number; withoutTax: number };
  descriptionWidthUnits: { withTax: number; withoutTax: number };
}

/** Metriken der Vorlage `standard` (unverändert seit Version 1). */
export const STANDARD_PAGE_METRICS: PdfPageMetrics = {
  firstPageRowHeight: 355,
  continuationPageRowHeight: 550,
  summaryHeight: 200,
  rowPadding: 16,
  nameLineHeight: 15,
  descriptionLineHeight: 12,
  descriptionGap: 3,
  nameWidthUnits: { withTax: 34, withoutTax: 44 },
  descriptionWidthUnits: { withTax: 36, withoutTax: 46 },
};

export type PdfPageRow<T extends PaginatableRow = PdfRow> = T & {
  /** Nur der erste Teil einer Position zeigt Nummer, Menge und Preis. */
  isContinuation?: boolean;
};

export interface PdfPageSlice<T extends PaginatableRow = PdfRow> {
  rows: PdfPageRow<T>[];
  isFirst: boolean;
  showSummary: boolean;
}

/** Summe der auf genau dieser Seite beginnenden Netto-Positionen. */
export function calculatePageSubtotal(rows: PdfPageRow<PaginatableRow>[]): number {
  return rows.reduce((sum, row) => sum + (row.isContinuation ? 0 : row.totalAmount), 0);
}

/** Formatierte Seitenzwischensumme — Vorlagen formatieren keine Beträge selbst. */
export function formatPageSubtotal(rows: PdfPageRow<PaginatableRow>[]): string {
  return formatMoney(calculatePageSubtotal(rows));
}

/** Seitenzwischensumme ohne Währungszeichen („1.234,50“). */
export function formatPageSubtotalDecimal(rows: PdfPageRow<PaginatableRow>[]): string {
  return formatDecimal(calculatePageSubtotal(rows));
}

function characterUnits(char: string): number {
  if (/\s/u.test(char)) return 0.6;
  if (/[MWÄÖÜ@#%]/u.test(char)) return 1.5;
  if (/[ilI.,:;!|]/u.test(char)) return 0.5;
  return 1;
}

/**
 * Konservative Zeilenbreite für Hanken Grotesk. Explizite Umbrüche bleiben
 * erhalten; nur zusätzliche visuelle Umbrüche werden eingefügt. Auch lange
 * Wörter werden geteilt, damit kein Text über die Zellengrenze laufen kann.
 */
export function wrapPdfCellText(value: string, maxUnits: number): string[] {
  return value.split("\n").flatMap((paragraph) => {
    const chars = Array.from(paragraph);
    if (chars.length === 0) return [""];
    const lines: string[] = [];
    let offset = 0;
    while (offset < chars.length) {
      let end = offset;
      let units = 0;
      while (end < chars.length && units + characterUnits(chars[end]) <= maxUnits) {
        units += characterUnits(chars[end]);
        end += 1;
      }
      if (end === offset) end += 1;
      if (end < chars.length) {
        const lastSpace = chars.slice(offset, end).findLastIndex((char) => /\s/u.test(char));
        if (lastSpace >= Math.floor((end - offset) / 2)) end = offset + lastSpace + 1;
      }
      lines.push(chars.slice(offset, end).join(""));
      offset = end;
    }
    return lines;
  });
}

/**
 * Plant Zeilen nach Höhe statt Positionszahl. Ein einzelner langer Text wird
 * in Folgeseiten-Teile zerlegt; Preis und Seitensumme erscheinen nur beim
 * ersten Teil. Die Seiten bleiben unabhängig von React-PDFs Auto-Wrap, damit
 * Tabellenkopf, Fortsetzungskopf, Summen und Footer feste Plätze haben.
 */
export function paginatePdfRows<T extends PaginatableRow>(
  rows: T[],
  showTaxDetails = false,
  metrics: PdfPageMetrics = STANDARD_PAGE_METRICS,
): PdfPageSlice<T>[] {
  const pageBudget = (isFirst: boolean) =>
    isFirst ? metrics.firstPageRowHeight : metrics.continuationPageRowHeight;
  const pages: PdfPageSlice<T>[] = [{ rows: [], isFirst: true, showSummary: false }];
  let used = 0;
  const newPage = () => {
    pages.push({ rows: [], isFirst: false, showSummary: false });
    used = 0;
  };

  for (const [rowIndex, row] of rows.entries()) {
    const nameWidth = showTaxDetails ? metrics.nameWidthUnits.withTax : metrics.nameWidthUnits.withoutTax;
    const detailWidth = showTaxDetails
      ? metrics.descriptionWidthUnits.withTax
      : metrics.descriptionWidthUnits.withoutTax;
    const nameLines = Math.max(
      wrapPdfCellText(row.descriptionDe, nameWidth).length,
      row.minNameLines ?? 1,
    );
    const descriptionLines = row.additionalDescriptionDe === null
      ? []
      : wrapPdfCellText(row.additionalDescriptionDe, detailWidth);
    let detailOffset = 0;
    let firstPart = true;

    while (true) {
      const baseHeight = metrics.rowPadding + (firstPart ? nameLines * metrics.nameLineHeight : 0);
      const gap = firstPart && descriptionLines.length > 0 ? metrics.descriptionGap : 0;
      const available = pageBudget(pages.at(-1)!.isFirst) - used;
      const capacity = Math.floor((available - baseHeight - gap) / metrics.descriptionLineHeight);
      if (available < baseHeight + gap || (descriptionLines.length > detailOffset && capacity < 1)) {
        newPage();
        continue;
      }

      const remaining = descriptionLines.length - detailOffset;
      let count = Math.min(remaining, capacity);
      if (
        rowIndex === rows.length - 1
        && remaining <= capacity
        && used + baseHeight + gap + remaining * metrics.descriptionLineHeight + metrics.summaryHeight
          > pageBudget(pages.at(-1)!.isFirst)
      ) {
        const finalPageCapacity = Math.floor(
          (metrics.continuationPageRowHeight - metrics.rowPadding - metrics.summaryHeight)
            / metrics.descriptionLineHeight,
        );
        const beforeFinalPage = Math.max(0, remaining - finalPageCapacity);
        if (beforeFinalPage > 0) count = beforeFinalPage;
        else if (pages.at(-1)!.rows.length > 0) {
          newPage();
          continue;
        }
      }
      const fragment: PdfPageRow<T> = {
        ...row,
        additionalDescriptionDe: count > 0
          ? descriptionLines.slice(detailOffset, detailOffset + count).join("\n")
          : null,
        ...(firstPart ? {} : { isContinuation: true }),
      };
      pages.at(-1)!.rows.push(fragment);
      used += baseHeight + gap + count * metrics.descriptionLineHeight;
      detailOffset += count;
      firstPart = false;
      if (detailOffset >= descriptionLines.length) break;
      newPage();
    }
  }

  if (used + metrics.summaryHeight > pageBudget(pages.at(-1)!.isFirst)) newPage();
  pages.at(-1)!.showSummary = true;
  return pages;
}
