/**
 * Tabellenraster der Vorlage `erhan-excel`: zurückhaltende Excel-Gitterlinien
 * (nur im Tabellenbereich), zweizeiliger Kopf, Positionen auf ganzen
 * Rasterzeilen und rechtsbündiger Summenblock mit kräftiger Linie unter der
 * Mehrwertsteuer — die einzige echte Rahmenlinie der Referenz.
 */

import { Text, View } from "@react-pdf/renderer";
import type { DocumentRenderData } from "@/lib/pdf/render-data";
import { formatPageSubtotal, type PdfPageRow } from "@/lib/pdf/document-pages";
import { ERHAN_LABELS as L } from "./erhan-excel-labels";
import type { ErhanRow } from "./erhan-excel-layout";
import { ERHAN_COLUMNS, ERHAN_GEOMETRY as G, ERHAN_ROW, erhanStyles as s } from "./erhan-excel.styles";

/** Hellgraue Rasterlinien von `top` bis `bottom`; der Tabellenkopf ist eine verbundene Doppelzeile. */
export function ErhanGrid({ top, bottom }: { top: number; bottom: number }) {
  const lines = [top];
  for (let y = top + G.headHeight; y <= bottom + 0.01; y += ERHAN_ROW) lines.push(y);
  return (
    <>
      {lines.map((y) => <View key={`h-${y}`} style={[s.gridLineH, { top: y - 0.25 }]} />)}
      {ERHAN_COLUMNS.map((x) => (
        <View key={`v-${x}`} style={[s.gridLineV, { left: x - 0.25, top, height: bottom - top }]} />
      ))}
    </>
  );
}

export function ErhanTableHead() {
  return (
    <View style={s.headRow}>
      <Text style={[s.cA, s.headSingle]}>{L.position}</Text>
      <Text style={[s.cB, s.headSingle, s.centered]}>{L.leistung}</Text>
      <Text style={[s.cC, s.headSingle, s.centered]}>{L.preis}</Text>
      <Text style={[s.cD, s.headSingle]}>{L.art}</Text>
      <Text style={s.cE}>{L.menge}</Text>
      <Text style={s.cF}>{L.gesamt}</Text>
    </View>
  );
}

export function ErhanItemRow({ row }: { row: PdfPageRow<ErhanRow> }) {
  const first = !row.isContinuation;
  const text = [first ? row.descriptionDe : null, row.additionalDescriptionDe]
    .filter((part): part is string => part !== null)
    .join("\n");
  return (
    <View style={s.itemRow} wrap={false}>
      <Text style={s.cA}>{first ? row.position : ""}</Text>
      <Text style={s.cB}>{text}</Text>
      <Text style={s.cC}>{first ? row.unitPriceDecimalText : ""}</Text>
      <Text style={s.cD}>{first ? row.artText : ""}</Text>
      <Text style={s.cE}>{first ? row.amountDecimalText : ""}</Text>
      <Text style={s.cF}>{first ? row.totalAmountText : ""}</Text>
    </View>
  );
}

function TotalsRow({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <View style={s.totalsRow}>
      <Text style={wide ? s.totalsLabelWide : s.totalsLabel}>{label}</Text>
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
      <TotalsRow label={L.zwischensumme} value={formatPageSubtotal(rows)} wide />
    </View>
  );
}
