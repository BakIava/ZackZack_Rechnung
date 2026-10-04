/**
 * Positionstabelle der Vorlage `ths-classic`: kräftige Linien, kompakte fette
 * Zeilen, Summenblock Netto / Mehrwertsteuer / Brutto wie in der Referenz.
 * Die Referenzspalte „Datum“ (Positionsdatum) hat keine Entsprechung; ihr Platz
 * trägt bei Steuerausweis den Satz der Position, sonst die Bezeichnung.
 */

import { Text, View } from "@react-pdf/renderer";
import type { DocumentRenderData } from "@/lib/pdf/render-data";
import { formatPageSubtotalDecimal, type PdfPageRow } from "@/lib/pdf/document-pages";
import { breakLongWords, type ThsRow } from "./ths-classic-layout";
import { THS_LABELS as L } from "./ths-classic-labels";
import { thsStyles as s } from "./ths-classic.styles";

interface ShowTaxProps {
  showTax: boolean;
}

export function ThsTableHead({ showTax }: ShowTaxProps) {
  return (
    <>
      <View style={s.headRule} />
      <View style={s.headRow}>
        <Text style={s.cPos}>{L.position}</Text>
        <Text style={s.cMenge}>{L.menge}</Text>
        <Text style={showTax ? s.cBez : s.cBezWide}>{L.bezeichnung}</Text>
        {showTax && <Text style={s.cUst}>{L.ust}</Text>}
        <Text style={s.cEinzelHead}>{L.einzelpreis}</Text>
        <Text style={s.cGesamtHead}>{L.gesamtpreis}</Text>
      </View>
      <View style={s.headRule} />
    </>
  );
}

export function ThsItemRow({ row, showTax }: ShowTaxProps & { row: PdfPageRow<ThsRow> }) {
  const first = !row.isContinuation;
  return (
    <View style={s.itemRow} wrap={false}>
      <Text style={s.cPos}>{first ? row.position : ""}</Text>
      <Text style={s.cMenge}>{first ? row.quantityText : ""}</Text>
      <View style={showTax ? s.cBez : s.cBezWide}>
        {first && <Text hyphenationCallback={breakLongWords}>{row.descriptionDe}</Text>}
        {row.additionalDescriptionDe !== null && (
          <Text
            style={[s.description, first ? { marginTop: 1 } : {}]}
            hyphenationCallback={breakLongWords}
          >
            {row.additionalDescriptionDe}
          </Text>
        )}
      </View>
      {showTax && <Text style={s.cUst}>{first ? row.taxRateText : ""}</Text>}
      <Text style={s.cEinzel}>{first ? row.unitPriceDecimalText : ""}</Text>
      <Text style={s.cGesamt}>{first ? row.totalAmountDecimalText : ""}</Text>
    </View>
  );
}

function SummaryRow({ label, rate, value }: { label: string; rate?: string; value: string }) {
  return (
    <>
      <View style={s.summaryRule} />
      <View style={s.summaryRow}>
        <Text style={s.sLabel}>{label}</Text>
        <Text style={s.sRate}>{rate ?? ""}</Text>
        <Text style={s.sValue}>{value}</Text>
      </View>
    </>
  );
}

/** Netto / Mehrwertsteuer je Satz / Brutto; bei §19 ohne Steuerausweis nur der Endbetrag. */
export function ThsSummary({ data }: { data: DocumentRenderData }) {
  const { totals, tax, document: doc } = data;
  return (
    <View wrap={false}>
      <View style={s.gapBeforeSummary} />
      {tax.showTaxDetails ? (
        <>
          <SummaryRow label={L.summeNetto} value={totals.netAmountDecimalText} />
          {totals.taxGroups.map((group) => (
            <SummaryRow
              key={group.rate}
              label={L.mehrwertsteuer}
              rate={`${group.rateDecimalText}%`}
              value={group.taxAmountDecimalText}
            />
          ))}
          <SummaryRow label={L.summeBrutto} value={totals.grossAmountDecimalText} />
        </>
      ) : (
        <SummaryRow label={doc.sumLabel} value={totals.grossAmountDecimalText} />
      )}
    </View>
  );
}

/** Zwischensumme der auf dieser Seite beginnenden Positionen (Nicht-Schlussseiten). */
export function ThsPageSubtotal({ rows, showTax }: ShowTaxProps & { rows: PdfPageRow<ThsRow>[] }) {
  return (
    <View wrap={false}>
      <View style={s.gapBeforeSummary} />
      <SummaryRow
        label={showTax ? L.zwischensummeNetto : L.zwischensumme}
        value={formatPageSubtotalDecimal(rows)}
      />
    </View>
  );
}
