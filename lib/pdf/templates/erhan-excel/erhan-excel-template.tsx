/**
 * Vorlage `erhan-excel` (Version 1) — Nachbildung der ERHAN-Excel-Rechnung als
 * echtes PDF: Logo oben rechts, unterstrichene Absenderzeile, fetter Empfänger-
 * und Kontaktblock, „Rechnung“ groß, Positionen im zurückhaltenden Excel-Raster,
 * Summen unten rechts mit kräftiger Linie unter der Mehrwertsteuer.
 *
 * Konsumiert ausschließlich die normalisierten Renderdaten (keine Berechnung,
 * keine Formatierung, kein Datenzugriff). IMMER Deutsch/LTR. Version 1 ist nach
 * Veröffentlichung optisch eingefroren — eine neue Optik ist `erhan-excel@2`.
 */

import { Document, Page, View } from "@react-pdf/renderer";
import { DOCUMENT_LOCALE } from "@/lib/document-locale";
import { paginatePdfRows, PDF_A4_SIZE } from "@/lib/pdf/document-pages";
import type { DocumentTemplateProps } from "../template-types";
import { ErhanContinuationHead, ErhanFooter, ErhanLetterhead, ErhanNotes } from "./erhan-excel-blocks";
import { buildErhanRows, erhanPageMetrics, erhanTotalsTop } from "./erhan-excel-layout";
import { ERHAN_GEOMETRY as G, erhanStyles as s } from "./erhan-excel.styles";
import { ErhanGrid, ErhanItemRow, ErhanPageSubtotal, ErhanTableHead, ErhanTotals } from "./erhan-excel-table";

export function ErhanExcelTemplate({ data }: DocumentTemplateProps) {
  const pages = paginatePdfRows(buildErhanRows(data), data.tax.showTaxDetails, erhanPageMetrics(data));
  const totalsTop = erhanTotalsTop(data);

  return (
    <Document language={DOCUMENT_LOCALE} title={data.document.title}>
      {pages.map((page, index) => {
        const gridTop = page.isFirst ? G.gridTop : G.continuationGridTop;
        const rowsTop = page.isFirst ? G.firstRowsTop : G.continuationRowsTop;
        return (
          <Page key={`page-${index}`} size={PDF_A4_SIZE} style={s.page}>
            {page.isFirst ? <ErhanLetterhead data={data} /> : <ErhanContinuationHead data={data} />}
            <ErhanGrid top={gridTop} bottom={page.showSummary ? G.totalsBottom : G.gridBottom} />
            <View style={[s.rows, { top: gridTop }]}>
              <ErhanTableHead />
            </View>
            <View style={[s.rows, { top: rowsTop }]} wrap={false}>
              {page.rows.map((row) => (
                <ErhanItemRow key={`${row.position}-${row.isContinuation ? "continued" : "start"}`} row={row} />
              ))}
            </View>
            {page.showSummary ? (
              <>
                <ErhanTotals data={data} top={totalsTop} />
                <ErhanNotes data={data} />
              </>
            ) : (
              page.rows.some((row) => !row.isContinuation) && <ErhanPageSubtotal rows={page.rows} />
            )}
            <ErhanFooter data={data} pageNumber={index + 1} pageCount={pages.length} />
          </Page>
        );
      })}
    </Document>
  );
}
