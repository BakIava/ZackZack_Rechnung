/**
 * Vorlage `ths-classic` (Version 1) — originalgetreue Nachbildung der
 * THS-Referenzrechnung: schwarzes Kopfband, Anschrift/Belegangaben, kompakte
 * Positionstabelle mit kräftigen Linien, Summenblock, Rechtshinweis,
 * Zahlungsbedingung, Grußformel und schwarzer Footer auf jeder Seite.
 *
 * Konsumiert ausschließlich die normalisierten Renderdaten (keine Berechnung,
 * keine Formatierung, kein Datenzugriff). IMMER Deutsch/LTR. Version 1 ist nach
 * Veröffentlichung optisch eingefroren — eine neue Optik ist `ths-classic@2`.
 */

import { Document, Page, Text, View } from "@react-pdf/renderer";
import { DOCUMENT_LOCALE } from "@/lib/document-locale";
import { paginatePdfRows, PDF_A4_SIZE } from "@/lib/pdf/document-pages";
import type { DocumentRenderData } from "@/lib/pdf/render-data";
import type { DocumentTemplateProps } from "../template-types";
import {
  ThsContinuationHead,
  ThsFirstPageHead,
  ThsFooterBand,
  ThsHeaderBand,
} from "./ths-classic-blocks";
import { breakLongWords, buildThsRows, thsPageMetrics } from "./ths-classic-layout";
import { THS_LABELS as L } from "./ths-classic-labels";
import { THS_GEOMETRY, thsStyles as s } from "./ths-classic.styles";
import { ThsItemRow, ThsPageSubtotal, ThsSummary, ThsTableHead } from "./ths-classic-table";

/** §19-Hinweis, Zahlungsbedingung, Grußformel und Firmenname unter dem Summenblock. */
function ThsClosing({ data }: { data: DocumentRenderData }) {
  return (
    <View wrap={false}>
      {data.tax.showKleinunternehmerHinweis && (
        <Text style={s.note}>{data.tax.kleinunternehmerHinweis}</Text>
      )}
      {data.payment.termsText && (
        <>
          <Text style={s.termsHead}>{L.zahlungsbedingung}</Text>
          <Text style={s.terms}>{data.payment.termsText}</Text>
        </>
      )}
      <Text style={s.closingLine}>{L.gruss}</Text>
      <Text style={s.closingLine} hyphenationCallback={breakLongWords}>{data.company.name}</Text>
    </View>
  );
}

export function ThsClassicTemplate({ data }: DocumentTemplateProps) {
  const showTax = data.tax.showTaxDetails;
  const pages = paginatePdfRows(buildThsRows(data), showTax, thsPageMetrics(data));

  return (
    <Document language={DOCUMENT_LOCALE} title={data.document.title}>
      {pages.map((page, index) => (
        <Page key={`page-${index}`} size={PDF_A4_SIZE} style={s.page}>
          <ThsHeaderBand data={data} />
          {page.isFirst ? <ThsFirstPageHead data={data} /> : <ThsContinuationHead data={data} />}
          <View
            wrap={false}
            style={[
              s.flow,
              { top: page.isFirst ? THS_GEOMETRY.tableTop : THS_GEOMETRY.continuationTableTop },
            ]}
          >
            <View style={s.table}>
              <ThsTableHead showTax={showTax} />
              {page.rows.map((row) => (
                <ThsItemRow
                  key={`${row.position}-${row.isContinuation ? "continued" : "start"}`}
                  row={row}
                  showTax={showTax}
                />
              ))}
              {page.showSummary ? (
                <ThsSummary data={data} />
              ) : (
                page.rows.some((row) => !row.isContinuation) && (
                  <ThsPageSubtotal rows={page.rows} showTax={showTax} />
                )
              )}
            </View>
            {page.showSummary && <ThsClosing data={data} />}
          </View>
          <ThsFooterBand data={data} pageNumber={index + 1} pageCount={pages.length} />
        </Page>
      ))}
    </Document>
  );
}
