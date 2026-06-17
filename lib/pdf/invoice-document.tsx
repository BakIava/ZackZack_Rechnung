import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { DOCUMENT_LOCALE } from "@/lib/document-locale";
import { formatCents } from "@/lib/money";
import { type SampleInvoiceData } from "@/lib/pdf/sample-data";

export type { SampleInvoiceData } from "@/lib/pdf/sample-data";
export { sampleInvoiceData } from "@/lib/pdf/sample-data";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  block: {
    marginBottom: 8,
  },
  label: {
    fontSize: 8,
    color: "#666",
    marginBottom: 2,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    paddingBottom: 4,
    marginBottom: 4,
    fontWeight: "bold",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#eee",
  },
  colDesc: { width: "55%" },
  colQty: { width: "15%", textAlign: "right" },
  colPrice: { width: "15%", textAlign: "right" },
  colTotal: { width: "15%", textAlign: "right" },
  totalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 12,
    fontSize: 12,
    fontWeight: "bold",
  },
  legalNote: {
    marginTop: 24,
    fontSize: 8,
    color: "#444",
  },
  localeTag: {
    position: "absolute",
    top: 20,
    right: 40,
    fontSize: 7,
    color: "#999",
  },
});

export function SampleInvoiceDocument({ data }: { data: SampleInvoiceData }) {
  const subtotalCents = data.lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPriceCents,
    0,
  );

  return (
    <Document language={DOCUMENT_LOCALE}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.localeTag}>Dokument: Deutsch ({DOCUMENT_LOCALE})</Text>

        <View style={styles.header}>
          <Text style={styles.title}>Rechnung</Text>
          <Text>Nr. {data.invoiceNumber}</Text>
          <Text>Datum: {data.issueDate}</Text>
        </View>

        <View style={styles.row}>
          <View>
            <Text style={styles.label}>Rechnungssteller</Text>
            <Text style={styles.block}>{data.seller.name}</Text>
            <Text>{data.seller.address}</Text>
          </View>
          <View>
            <Text style={styles.label}>Rechnungsempfänger</Text>
            <Text style={styles.block}>{data.customer.name}</Text>
            <Text>{data.customer.address}</Text>
          </View>
        </View>

        <View style={styles.tableHeader}>
          <Text style={styles.colDesc}>Leistung</Text>
          <Text style={styles.colQty}>Menge</Text>
          <Text style={styles.colPrice}>Einzelpreis</Text>
          <Text style={styles.colTotal}>Gesamt</Text>
        </View>

        {data.lineItems.map((item, index) => (
          <View key={index} style={styles.tableRow}>
            <Text style={styles.colDesc}>{item.description}</Text>
            <Text style={styles.colQty}>{item.quantity}</Text>
            <Text style={styles.colPrice}>
              {formatCents(item.unitPriceCents)}
            </Text>
            <Text style={styles.colTotal}>
              {formatCents(item.quantity * item.unitPriceCents)}
            </Text>
          </View>
        ))}

        <View style={styles.totalRow}>
          <Text>Gesamtbetrag: {formatCents(subtotalCents)}</Text>
        </View>

        {data.smallBusinessExempt && (
          <Text style={styles.legalNote}>
            Gemäß § 19 UStG wird keine Umsatzsteuer ausgewiesen
            (Kleinunternehmerregelung).
          </Text>
        )}
      </Page>
    </Document>
  );
}
