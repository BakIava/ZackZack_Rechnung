/** Kopf, Hinweise und Fußzeile der Vorlage `erhan-excel`. */

import { Image, Text } from "@react-pdf/renderer";
import type { DocumentRenderData } from "@/lib/pdf/render-data";
import { joinText } from "@/lib/pdf/join-text";
import { ERHAN_LABELS as L } from "./erhan-excel-labels";
import { ERHAN_LOGO_DATA_URL } from "./erhan-excel-logo";
import { erhanContactBlock, erhanDateLine, erhanFirstPageShift, erhanServiceLocationLines, fitMeasured } from "./erhan-excel-layout";
import { ERHAN_GEOMETRY as G, ERHAN_ROW, ERHAN_COLUMNS, erhanStyles as s, erhanTop, FOOTER_COLUMN, FOOTER_SIZE } from "./erhan-excel.styles";

interface DataProps {
  data: DocumentRenderData;
}

/** Erste Seite: festes Vorlagen-Logo (nicht das Firmenlogo), Absenderzeile, Empfänger, Kontakt, Ort/Datum, Titel, Nummer, Leistungsangabe. */
export function ErhanLetterhead({ data }: DataProps) {
  const { company: co, customer, document: doc, dates } = data;
  const contact: Array<[string, string]> = [
    [L.telefon, co.phone ?? ""],
    [L.mobil, co.mobile ?? ""],
    [L.fax, co.fax ?? ""],
    [L.email, co.email ?? ""],
    [L.web, co.website ?? ""],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));
  const contactBlock = erhanContactBlock(contact.map(([, value]) => value));
  const recipient = [customer.name, customer.streetLine, customer.cityLine].filter(Boolean);
  const place = co.city ? `${co.city}, ${L.den} ` : "";
  const dateText = `${place}${dates.issueDateText}`;
  const dateLine = erhanDateLine(dateText);
  const locationLines = erhanServiceLocationLines(data);
  const firstPageShift = erhanFirstPageShift(data);

  return (
    <>
      {/* eslint-disable-next-line jsx-a11y/alt-text */}
      <Image style={s.logo} src={ERHAN_LOGO_DATA_URL} />
      <Text style={s.sender}>{joinText([co.name, co.streetLine, co.cityLine], "   ")}</Text>
      {recipient.length > 0 && <Text style={s.recipient}>{recipient.join("\n")}</Text>}
      {contact.map(([label, value], index) => {
        const baseline = G.contactBaseline + index * G.contactLineHeight;
        const size = contactBlock.sizes[index];
        const valueBox = { left: contactBlock.valueX, width: contactBlock.valueWidth };
        return [
          <Text key={`${label}-l`} style={[s.contactLabel, { left: contactBlock.labelX, top: erhanTop(baseline, 12) }]}>
            {label}
          </Text>,
          <Text key={`${label}-v`} style={[s.contactValue, { ...valueBox, top: erhanTop(baseline, size), fontSize: size }]}>
            {value}
          </Text>,
        ];
      })}
      <Text
        style={[s.date, { ...dateLine, top: erhanTop(G.dateBaseline, dateLine.fontSize) }]}
      >
        {dateText}
      </Text>
      <Text style={s.title}>{doc.typeLabel}</Text>
      <Text style={[s.number, { top: erhanTop(G.numberBaseline, 10) }]}>
        {`${doc.numberLabel} ${doc.numberText}`}
      </Text>
      {locationLines.length > 0 && (
        <Text style={[s.locationLabel, {
          left: G.left,
          top: erhanTop(G.validUntilBaseline, 10),
          width: G.locationIndent - 5,
        }]}>
          {L.einsatzort}
        </Text>
      )}
      {locationLines.map((line, index) => (
        <Text key={`location-${index}`} style={[s.locationValue, line.isName ? s.locationName : {}, {
          left: G.left + G.locationIndent,
          top: erhanTop(G.validUntilBaseline + index * ERHAN_ROW, 10),
          width: ERHAN_COLUMNS.at(-1)! - G.left - G.locationIndent - 5,
        }]}>
          {line.text}
        </Text>
      ))}
      {dates.validUntilText && (
        <Text style={[s.number, { top: erhanTop(
          G.validUntilBaseline + locationLines.length * ERHAN_ROW, 10,
        ) }]}>
          {`${L.gueltigBis} ${dates.validUntilText}`}
        </Text>
      )}
      {dates.serviceTiming && (
        <Text style={[s.serviceTiming, { top: erhanTop(G.serviceTimingBaseline + firstPageShift, 10) }]}>
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

const FOOTER_ALIGN = { left: s.footerLeft, center: s.footerCenter, right: s.footerRight } as const;

interface FooterColumnProps {
  lines: Array<string | null>;
  column: keyof typeof FOOTER_ALIGN;
}

/** Eine Fußspalte: bis zu drei Zeilen auf festen Grundlinien, jede einzeilig eingepasst. */
function FooterColumn({ lines, column }: FooterColumnProps) {
  const width = FOOTER_COLUMN - 2.5;
  const align = FOOTER_ALIGN[column];
  return (
    <>
      {lines.map((line, index) => {
        if (!line) return null;
        const size = fitMeasured(line, width, FOOTER_SIZE);
        return (
          <Text
            key={`${index}-${line}`}
            style={[s.footerCell, align, { top: erhanTop(G.footerBaselines[index], size), fontSize: size }]}
          >
            {line}
          </Text>
        );
      })}
    </>
  );
}

/**
 * Jede Seite, dreispaltig wie die Referenz: Firma und Anschrift | Bank, IBAN,
 * BIC | Steuernummer und Inhaber. „Seite x von y“ nur bei mehrseitigen Belegen.
 */
export function ErhanFooter({ data, pageNumber, pageCount }: FooterProps) {
  const { payment, company } = data;
  const taxLabel = company.steuernummer ? L.stNr : `${company.taxIdLabel}:`;
  return (
    <>
      <FooterColumn column="left" lines={[company.name, company.streetLine, company.cityLine]} />
      <FooterColumn
        column="center"
        lines={[
          payment.bankName,
          payment.iban ? `${L.iban} ${payment.iban}` : null,
          payment.bic ? `${L.bic} ${payment.bic}` : null,
        ]}
      />
      <FooterColumn
        column="right"
        lines={[
          `${taxLabel} ${company.taxIdValue}`,
          company.director ? L.geschaeftsinhaber : null,
          company.director,
        ]}
      />
      {pageCount > 1 && <Text style={s.footerPage}>{`${L.seite} ${pageNumber} ${L.von} ${pageCount}`}</Text>}
    </>
  );
}
