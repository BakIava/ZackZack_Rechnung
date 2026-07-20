/**
 * PDF-Beleg (@react-pdf/renderer) — die druckbare Entsprechung der A4-Vorschau
 * (components/create/document-a4.tsx). IMMER Deutsch/LTR, reine Kundensicht.
 *
 * Harte Regeln (in pdf-view-model + Typen abgesichert):
 *  - Kein Einkaufspreis / keine Marge — nur Verkaufspreis pro Zeile.
 *  - §19-Kleinunternehmer: keine USt., automatischer §19-Hinweis.
 *  - Empfänger aus dem Snapshot; Dokumentsprache unabhängig von der Bedienung.
 *
 * Reproduzierbar: bei gleichem (finalisiertem, eingefrorenem) Dokument rendert
 * dieselbe Eingabe denselben Beleg — es fließen keine Zufalls-/Zeitwerte ein.
 */

import { Document, Image, Page, Text, View } from "@react-pdf/renderer";
import { DOCUMENT_LOCALE } from "@/lib/document-locale";
import { DOKUMENT_DE } from "@/lib/documents/document-de";
import type { DocumentPreview } from "@/types/document";
import { buildPdfViewModel, type PdfViewModel } from "@/lib/pdf/pdf-view-model";
import { pdfStyles as s } from "@/lib/pdf/document-pdf.styles";

/** Vorbereitetes Rasterlogo (Data-URL). Fehler → null → Monogramm. */
export interface PdfLogo {
  dataUrl: string;
}

interface DocumentPdfProps {
  preview: DocumentPreview;
  logo: PdfLogo | null;
}

function Header({ vm, logo }: { vm: PdfViewModel; logo: PdfLogo | null }) {
  return (
    <View style={s.top}>
      <View>
        <Text style={s.coName}>{vm.companyName}</Text>
        {!!vm.companyAddressLine && <Text style={s.coAddr}>{vm.companyAddressLine}</Text>}
        {!!vm.companyContactLine && <Text style={s.coContact}>{vm.companyContactLine}</Text>}
      </View>
      {logo ? (
        // eslint-disable-next-line jsx-a11y/alt-text
        <Image style={s.logoImg} src={logo.dataUrl} />
      ) : (
        <View style={s.logoBox}>
          <Text style={s.logoText}>{vm.monogram}</Text>
        </View>
      )}
    </View>
  );
}

function MetaRow({ label, value, draft }: { label: string; value: string; draft?: boolean }) {
  return (
    <View style={s.metaRow}>
      <Text style={s.metaKey}>{label}</Text>
      <Text style={draft ? s.metaValDraft : s.metaVal}>{value}</Text>
    </View>
  );
}

function Parties({ vm }: { vm: PdfViewModel }) {
  return (
    <View style={s.mid}>
      <View style={s.midLeft}>
        <Text style={s.sender}>{vm.senderLine}</Text>
        <Text style={s.toLabel}>{vm.empfaengerLabel.toUpperCase()}</Text>
        <Text style={s.toName}>{vm.recipientName}</Text>
        {!!vm.recipientStreetLine && <Text style={s.toAddr}>{vm.recipientStreetLine}</Text>}
        {!!vm.recipientCityLine && <Text style={s.toAddr}>{vm.recipientCityLine}</Text>}
      </View>
      <View style={s.meta}>
        <MetaRow label={vm.numberLabel} value={vm.numberValue} draft={vm.isDraftNumber} />
        <MetaRow label={DOKUMENT_DE.datum} value={vm.dateValue} />
        {vm.serviceDateValue && (
          <MetaRow label={DOKUMENT_DE.leistungsdatum} value={vm.serviceDateValue} />
        )}
        {vm.validUntilValue && (
          <MetaRow label={DOKUMENT_DE.gueltigBis} value={vm.validUntilValue} />
        )}
        {/* <MetaRow label={vm.steuerLabel} value={vm.steuerValue} /> */}
      </View>
    </View>
  );
}

function ItemsTable({ vm }: { vm: PdfViewModel }) {
  const showTaxDetails = vm.showTaxDetails;
  return (
    <View>
      <View style={s.tHead}>
        <Text style={[s.tHeadCell, s.cPos]}>{DOKUMENT_DE.pos}</Text>
        <Text style={[s.tHeadCell, showTaxDetails ? s.cDesc : s.cDescNoVat]}>{DOKUMENT_DE.bezeichnung}</Text>
        <Text style={[s.tHeadCell, showTaxDetails ? s.cQty : s.cQtyNoVat]}>{DOKUMENT_DE.menge}</Text>
        <Text style={[s.tHeadCell, showTaxDetails ? s.cPrice : s.cPriceNoVat]}>{DOKUMENT_DE.einzelpreis}</Text>
        {showTaxDetails && <Text style={[s.tHeadCell, s.cVat]}>{DOKUMENT_DE.umsatzsteuer}</Text>}
        <Text style={[s.tHeadCell, s.cTotal]}>{DOKUMENT_DE.gesamtSpalte}</Text>
      </View>
      {vm.rows.map((r) => (
        <View key={r.position} style={s.tRow} wrap={false}>
          <Text style={[s.cellText, s.cPos]}>{r.position}</Text>
          <Text style={[s.cellText, showTaxDetails ? s.cDesc : s.cDescNoVat]}>{r.descriptionDe}</Text>
          <Text style={[s.cellText, showTaxDetails ? s.cQty : s.cQtyNoVat]}>{r.mengeText}</Text>
          <Text style={[s.cellText, showTaxDetails ? s.cPrice : s.cPriceNoVat]}>{r.unitPriceText}</Text>
          {showTaxDetails && <Text style={[s.cellText, s.cVat]}>{r.taxRateText}</Text>}
          <Text style={[s.cellText, s.cTotal]}>{r.totalText}</Text>
        </View>
      ))}
    </View>
  );
}

function Totals({ vm }: { vm: PdfViewModel }) {
  return (
    <View style={s.sumWrap}>
      <View style={s.sumBox}>
        {vm.showTaxDetails && (
          <View style={s.sumLine}>
            <Text style={s.sumLineLabel}>{vm.gesamtNettoLabel}</Text>
            <Text style={s.sumLineVal}>{vm.netTotalText}</Text>
          </View>
        )}
        {vm.taxLines.map((line) => (
          <View key={line.label} style={s.sumLine}>
            <Text style={s.sumLineLabel}>{line.label}</Text>
            <Text style={s.sumLineVal}>{line.amountText}</Text>
          </View>
        ))}
        <View style={s.grand}>
          <Text style={s.grandLabel}>
            {vm.showTaxDetails ? vm.sumLabel : vm.gesamtNettoLabel}
          </Text>
          <Text style={s.grandVal}>
            {vm.showTaxDetails ? vm.totalText : vm.netTotalText}
          </Text>
        </View>
      </View>
    </View>
  );
}

function Footer({ vm }: { vm: PdfViewModel }) {
  return (
    <View style={s.foot} fixed>
      <View style={s.footCol}>
        <Text style={s.footHead}>{vm.footerCompanyName}</Text>
        {vm.footerOwnerLine && <Text style={s.footText}>{vm.footerOwnerLine}</Text>}
        {!!vm.footerAddressLine && <Text style={s.footText}>{vm.footerAddressLine}</Text>}
      </View>
      <View style={s.footCol}>
        <Text style={s.footHead}>{DOKUMENT_DE.kontakt}</Text>
        {vm.footerContactPhone && <Text style={s.footText}>{vm.footerContactPhone}</Text>}
        {vm.footerContactEmail && <Text style={s.footText}>{vm.footerContactEmail}</Text>}
      </View>
      <View style={s.footCol}>
        <Text style={s.footHead}>{DOKUMENT_DE.bankUndSteuer}</Text>
        {vm.footerBankName && <Text style={s.footText}>{vm.footerBankName}</Text>}
        <Text style={s.footText}>
          {vm.steuerLabel} {vm.steuerValue}
        </Text>
      </View>
    </View>
  );
}

/** Vollständiger A4-Beleg. `logo` ist serverseitig vorbereitet (siehe document-logo.ts). */
export function DocumentPdf({ preview, logo }: DocumentPdfProps) {
  const vm = buildPdfViewModel(preview);
  const wort = preview.docType === "invoice" ? "Rechnung" : "Angebot";
  // Setzt die PDF-Metadaten /Title — dort lesen Browser den Tab-Titel bei
  // `inline`-Anzeige aus (die URL selbst endet nur auf ".../pdf").
  const title = preview.documentNumber ? `${wort} ${preview.documentNumber}` : wort;

  return (
    <Document language={DOCUMENT_LOCALE} title={title}>
      <Page size="A4" style={s.page}>
        <Header vm={vm} logo={logo} />
        <Parties vm={vm} />
        <Text style={s.h1}>{vm.title}</Text>
        <ItemsTable vm={vm} />
        <Totals vm={vm} />

        {vm.showKleinunternehmerHinweis && (
          <Text style={s.vat}>{vm.kleinunternehmerHinweis}</Text>
        )}
        {vm.paymentText && (
          <View style={s.pay}>
            <Text>{vm.paymentText}</Text>
            {vm.bankLine && <Text>{vm.bankLine}</Text>}
          </View>
        )}

        <Text style={s.thanks}>{vm.closingText}</Text>
        <Footer vm={vm} />
      </Page>
    </Document>
  );
}
