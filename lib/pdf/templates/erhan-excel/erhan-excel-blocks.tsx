/**
 * Kopf, Hinweise und Fußzeile der Vorlage `erhan-excel`. Das Referenzfeld
 * „Einsatzort“ hat keine Entsprechung in ZackZack; seine Zeile trägt bei
 * Angeboten die Gültigkeit, bei Rechnungen bleibt sie leer.
 */

import { Image, Text } from "@react-pdf/renderer";
import type { DocumentRenderData } from "@/lib/pdf/render-data";
import { joinText } from "@/lib/pdf/join-text";
import { ERHAN_LABELS as L } from "./erhan-excel-labels";
import { fitFontSize } from "./erhan-excel-layout";
import { ERHAN_GEOMETRY as G, erhanStyles as s, erhanTop } from "./erhan-excel.styles";

interface DataProps {
  data: DocumentRenderData;
}

const VALUE_WIDTH = G.contactValueRight - G.contactValueX;

/** Erste Seite: Logo, Absenderzeile, Empfänger, Kontakt, Ort/Datum, Titel, Nummer, Leistungsangabe. */
export function ErhanLetterhead({ data }: DataProps) {
  const { company: co, customer, document: doc, dates } = data;
  const contact: Array<[string, string]> = [
    [L.telefon, co.phone ?? ""],
    [L.mobil, co.mobile ?? ""],
    [L.fax, co.fax ?? ""],
    [L.email, co.email ?? ""],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));
  const recipient = [customer.name, customer.streetLine, customer.cityLine].filter(Boolean);
  const place = co.city ? `${co.city}, ${L.den} ` : "";

  return (
    <>
      {data.logo.image ? (
        // eslint-disable-next-line jsx-a11y/alt-text
        <Image style={s.logo} src={data.logo.image.dataUrl} />
      ) : (
        <Text style={s.logoText}>{co.name}</Text>
      )}
      <Text style={s.sender}>{joinText([co.name, co.streetLine, co.cityLine], "   ")}</Text>
      {recipient.length > 0 && <Text style={s.recipient}>{recipient.join("\n")}</Text>}
      {contact.map(([label, value], index) => {
        const baseline = G.contactBaseline + index * G.contactLineHeight;
        const size = fitFontSize(value, VALUE_WIDTH, 12);
        return [
          <Text key={`${label}-l`} style={[s.contactLabel, { top: erhanTop(baseline, 12) }]}>{label}</Text>,
          <Text key={`${label}-v`} style={[s.contactValue, { top: erhanTop(baseline, size), fontSize: size }]}>
            {value}
          </Text>,
        ];
      })}
      <Text style={s.date}>{`${place}${dates.issueDateText}`}</Text>
      <Text style={s.title}>{doc.typeLabel}</Text>
      <Text style={[s.number, { top: erhanTop(G.numberBaseline, 10) }]}>
        {`${doc.numberLabel} ${doc.numberText}`}
      </Text>
      {dates.validUntilText && (
        <Text style={[s.number, { top: erhanTop(G.validUntilBaseline, 10) }]}>
          {`${L.gueltigBis} ${dates.validUntilText}`}
        </Text>
      )}
      {dates.serviceTiming && (
        <Text style={s.serviceTiming}>
          {`${dates.serviceTiming.label} ${dates.serviceTiming.value}`}
        </Text>
      )}
    </>
  );
}

/** Folgeseiten: Belegnummer über dem fortgesetzten Raster. */
export function ErhanContinuationHead({ data }: DataProps) {
  return (
    <Text style={[s.number, { top: erhanTop(G.continuationNumberBaseline, 10) }]}>
      {`${data.document.typeLabel} · ${data.document.numberLabel} ${data.document.numberText}`}
    </Text>
  );
}

/** Schlussseite unter den Summen: §19-Hinweis und Zahlungsziel. */
export function ErhanNotes({ data }: DataProps) {
  const lines = [
    data.tax.showKleinunternehmerHinweis ? data.tax.kleinunternehmerHinweis : null,
    data.payment.termsText,
  ].filter((line): line is string => Boolean(line));
  if (lines.length === 0) return null;
  return <Text style={s.notes}>{lines.join("\n")}</Text>;
}

interface FooterProps extends DataProps {
  pageNumber: number;
  pageCount: number;
}

/** Jede Seite: Bankverbindung, Steuernummer/USt-IdNr. und Seitenzahl. */
export function ErhanFooter({ data, pageNumber, pageCount }: FooterProps) {
  const { payment, company } = data;
  const bank = joinText([
    payment.bankName,
    payment.iban ? `${L.iban} ${payment.iban}` : null,
    payment.bic ? `${L.bic} ${payment.bic}` : null,
  ], " · ");
  const [first, second] = G.footerBaselines;
  return (
    <>
      {bank && (
        <Text style={[s.footerLine, { top: erhanTop(first, 8) }]}>{`${L.bankverbindung} ${bank}`}</Text>
      )}
      <Text style={[s.footerLine, { top: erhanTop(second, 8) }]}>
        {`${company.taxIdLabel}: ${company.taxIdValue}`}
      </Text>
      <Text style={[s.footerPage, { top: erhanTop(second, 8) }]}>
        {`${L.seite} ${pageNumber} ${L.von} ${pageCount}`}
      </Text>
    </>
  );
}
