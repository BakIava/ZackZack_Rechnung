/**
 * Tabelle der Vorlage `erhan-excel`: ohne sichtbares Gitter, zweizeiliger
 * Kopf, Positionen auf ganzen Rasterzeilen und rechtsbündiger Summenblock mit
 * kräftiger Linie unter der Mehrwertsteuer — die einzige Linie der Tabelle.
 */

import { Text, View } from "@react-pdf/renderer";
import type { DocumentRenderData } from "@/lib/pdf/render-data";
import { formatPageSubtotal, type PdfPageRow } from "@/lib/pdf/document-pages";
import { ERHAN_LABELS as L } from "./erhan-excel-labels";
import { fitMeasured, type ErhanRow } from "./erhan-excel-layout";
import { ERHAN_BODY_SIZE, ERHAN_COLUMNS, ERHAN_GEOMETRY as G, ERHAN_ROW, erhanStyles as s } from "./erhan-excel.styles";

export function ErhanTableHead() {
  return (
    <View style={s.headRow}>
      <Text style={[s.cA, s.headSingle]}>{L.position}</Text>
      <Text style={[s.cB, s.headSingle, s.centered]}>{L.leistung}</Text>
      <Text style={[s.cC, s.headSingle]}>{L.preis}</Text>
      <Text style={[s.cD, s.headSingle]}>{L.art}</Text>
      <Text style={s.cE}>{L.menge}</Text>
      <Text style={s.cF}>{L.gesamt}</Text>
    </View>
  );
}

const NUMBER_COLUMNS = { 2: s.cC, 4: s.cE, 5: s.cF } as const;

interface NumberCellProps {
  column: keyof typeof NUMBER_COLUMNS;
  value: string;
}

/** Auch große Beträge bleiben einzeilig, damit gerenderte und geplante Zeilenhöhen übereinstimmen. */
function NumberCell({ column, value }: NumberCellProps) {
  const width = ERHAN_COLUMNS[column + 1] - ERHAN_COLUMNS[column] - 6;
  const size = fitMeasured(value, width, ERHAN_BODY_SIZE);
  return (
    <Text style={[NUMBER_COLUMNS[column], {
      fontSize: size, lineHeight: 1, height: ERHAN_ROW, paddingTop: ERHAN_BODY_SIZE - size,
    }]}>
      {value}
    </Text>
  );
}

interface ErhanItemRowProps {
  row: PdfPageRow<ErhanRow>;
}

export function ErhanItemRow({ row }: ErhanItemRowProps) {
  const first = !row.isContinuation;
  const text = [first ? row.descriptionDe : null, row.additionalDescriptionDe]
    .filter((part): part is string => part !== null)
    .join("\n");
  return (
    <View style={s.itemRow} wrap={false}>
      <Text style={s.cA}>{first ? row.position : ""}</Text>
      <Text style={s.cB}>{text}</Text>
      <NumberCell column={2} value={first ? row.unitPriceDecimalText : ""} />
      <Text style={s.cD}>{first ? row.artText : ""}</Text>
      <NumberCell column={4} value={first ? row.amountDecimalText : ""} />
      <NumberCell column={5} value={first ? row.totalAmountText : ""} />
    </View>
  );
}

interface TotalsRowProps {
  label: string;
  value: string;
}

function TotalsRow({ label, value }: TotalsRowProps) {
  return (
    <View style={s.totalsRow}>
      <Text style={s.totalsLabel}>{label}</Text>
      <Text style={s.totalsValue}>{value}</Text>
    </View>
  );
}

/** Netto / Mwst je Satz, kräftige Linie, Leerzeile, Gesamtbetrag — unten rechts verankert. */
export function ErhanTotals({ data, top }: { data: DocumentRenderData; top: number }) {
  const { totals, tax } = data;
  return (
    <View style={[s.totals, { top }]}>
      {tax.showTaxDetails && (
        <>
          <TotalsRow label={L.nettobetrag} value={totals.netAmountText} />
          {totals.taxGroups.map((group) => (
            <TotalsRow key={group.rate} label={`${L.mwst} ${group.rate}%`} value={group.taxAmountText} />
          ))}
        </>
      )}
      <View style={s.totalsRule} />
      <View style={s.totalsGap} />
      <TotalsRow label={L.gesamtbetrag} value={totals.grossAmountText} />
    </View>
  );
}

/** Letzte Rasterzeile einer Nicht-Schlussseite: Summe der hier beginnenden Positionen. */
export function ErhanPageSubtotal({ rows }: { rows: PdfPageRow<ErhanRow>[] }) {
  return (
    <View style={[s.totals, { top: G.gridBottom - ERHAN_ROW }]}>
      <TotalsRow label={L.zwischensumme} value={formatPageSubtotal(rows)} />
    </View>
  );
}
