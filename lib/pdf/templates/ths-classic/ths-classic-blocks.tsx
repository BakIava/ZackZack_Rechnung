/**
 * Feste Blöcke der Vorlage `ths-classic`: schwarzes Kopfband, Anschrift und
 * Belegangaben der ersten Seite, Fortsetzungskopf und schwarzer Footer.
 * Die Leistungszeilen im Kopfband sind fest hinterlegt (THS_HEADER_SERVICES).
 * Sachbearbeiter = Geschäftsführer der Firma, Ansprechpartner = Vor-/Nachname
 * eines Firmenkunden, Telefon = Telefon des Kunden (alles aus den Renderdaten).
 * Die „Lieferadresse“ der Referenz trägt den Einsatzort. Felder ohne
 * Entsprechung in ZackZack (Bauvorhaben, Mitarbeiter) bleiben bewusst leer.
 */

import { Image, Text, View } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import { joinText } from "@/lib/pdf/join-text";
import type { DocumentRenderData } from "@/lib/pdf/render-data";
import { breakLongWords } from "./ths-classic-layout";
import { THS_HEADER_SERVICES, THS_LABELS as L } from "./ths-classic-labels";
import { THS_GEOMETRY, THS_TYPE, thsStyles as s } from "./ths-classic.styles";

interface DataProps {
  data: DocumentRenderData;
}

function topFor(baseline: number, size: number): number {
  return baseline - size;
}

/** Schwarzes Kopfband: Logo bzw. Wortmarke und Firmenname links, Leistungszeilen rechts. */
export function ThsHeaderBand({ data }: DataProps) {
  return (
    <>
      <View style={s.band} />
      {data.logo.image ? (
        // eslint-disable-next-line jsx-a11y/alt-text
        <Image style={s.logo} src={data.logo.image.dataUrl} />
      ) : (
        <Text style={s.wordmark}>{data.logo.initials}</Text>
      )}
      <Text style={s.bandName}>{data.company.name}</Text>
      <Text style={s.bandServices}>{THS_HEADER_SERVICES.join("\n")}</Text>
    </>
  );
}

function addressLines(data: DocumentRenderData): string[] {
  const { customer } = data;
  if (!customer.snapshot) return [];
  return [
    customer.snapshot.customer_type === "business" ? L.firma : null,
    customer.name,
    customer.streetLine,
    customer.cityLine,
  ].filter((line): line is string => Boolean(line));
}

/** Einsatzort wie die Lieferadresse der Referenz: Name, Straße, Ort, Zusatz. */
function serviceLocationLines(data: DocumentRenderData): string[] {
  const location = data.serviceLocation;
  if (!location) return [];
  return [
    location.name,
    joinText([location.street, location.houseNumber], " "),
    joinText([location.postcode, location.city], " "),
    location.addressExtra,
  ].filter(Boolean);
}

function LabelValue({ label, value, boldValue = false }: {
  label: string;
  value: string;
  boldValue?: boolean;
}) {
  return (
    <>
      <Text style={s.bold}>{label}</Text>
      {" "}
      {boldValue ? <Text style={s.bold}>{value}</Text> : value}
    </>
  );
}

type LabeledLine = [label: string, value: string | null];

function presentLines(lines: LabeledLine[]): Array<[string, string]> {
  return lines.filter((line): line is [string, string] => Boolean(line[1]));
}

function numberLine(data: DocumentRenderData): string {
  const label = data.document.isInvoice ? L.rechnungsnummer : L.angebotsnummer;
  return `${label} ${data.document.numberText}`;
}

/**
 * Erste Seite: Empfänger, daneben der Einsatzort; rechts Belegdatum/Gültigkeit/Sachbearbeiter; links
 * Belegnummer, Ansprechpartner, Telefon, Liefer-/Montagetermin, Einleitung.
 * Fehlende Angaben entfallen, die folgenden Zeilen rücken nach.
 */
export function ThsFirstPageHead({ data }: DataProps) {
  const { document: doc, dates, customer } = data;
  const meta = presentLines([
    [L.belegdatum, dates.issueDateText],
    [L.gueltigBis, dates.validUntilText],
    [L.sachbearbeiter, data.company.director],
  ]);
  const info = presentLines([
    [L.ansprechpartner, customer.contactPersonName],
    [L.tel, customer.phone],
    [L.lieferMontagetermin, dates.serviceTiming?.value ?? null],
  ]);
  const lines = addressLines(data);
  const location = serviceLocationLines(data);

  return (
    <>
      {lines.length > 0 && (
        <Text style={s.address} hyphenationCallback={breakLongWords}>{lines.join("\n")}</Text>
      )}
      {location.length > 0 && (
        <Text style={s.serviceLocation} hyphenationCallback={breakLongWords}>
          <Text style={s.bold}>{L.einsatzort}</Text>
          {`\n${location.join("\n")}`}
        </Text>
      )}
      {meta.map(([label, value], index) => (
        <Text
          key={label}
          style={[s.metaLine, { top: topFor(THS_GEOMETRY.metaBaselines[index], THS_TYPE.body) }]}
        >
          <LabelValue label={label} value={value} />
        </Text>
      ))}
      <Text style={s.number}>{numberLine(data)}</Text>
      {info.map(([label, value], index) => (
        <Text
          key={label}
          style={[s.infoLine, { top: topFor(THS_GEOMETRY.infoBaselines[index], THS_TYPE.body) }]}
        >
          <LabelValue label={label} value={value} />
        </Text>
      ))}
      <Text style={[s.leftLine, { top: topFor(THS_GEOMETRY.introBaseline, THS_TYPE.body) }]}>
        {doc.isInvoice ? L.einleitungRechnung : L.einleitungAngebot}
      </Text>
    </>
  );
}

/** Folgeseiten: Belegnummer über der fortgesetzten Tabelle. */
export function ThsContinuationHead({ data }: DataProps) {
  return <Text style={s.continuationNumber}>{numberLine(data)}</Text>;
}

type FooterSlot = ReactNode | null;

function FooterColumn({ left, width, slots }: { left: number; width: number; slots: FooterSlot[] }) {
  return (
    <View style={[s.footerColumn, { left, width }]}>
      {slots.map((slot, index) => (
        <Text key={index} style={s.footerLine}>{slot ?? " "}</Text>
      ))}
    </View>
  );
}

interface FooterProps extends DataProps {
  pageNumber: number;
  pageCount: number;
}

/** Schwarzer Footer mit Inhaber, Sitz, Kontakt, Seitenzahl, Bank und Steuernummer. */
export function ThsFooterBand({ data, pageNumber, pageCount }: FooterProps) {
  const { company: co, payment } = data;
  const [col1, col2, col3] = THS_GEOMETRY.footerColumns;

  const contact = [
    co.phone ? <LabelValue key="t" label={L.telefon} value={co.phone} /> : null,
    co.mobile ? <LabelValue key="m" label={L.mobil} value={co.mobile} /> : null,
    co.email ? <LabelValue key="e" label={L.email} value={co.email} /> : null,
  ].filter(Boolean);
  const hasSeat = Boolean(co.streetLine || co.cityLine);
  const hasBank = Boolean(payment.bankName || payment.iban || payment.bic);

  return (
    <View style={s.footer}>
      <FooterColumn
        left={col1}
        width={col2 - col1 - 8}
        slots={[
          co.director ? <Text style={s.bold}>{L.geschaeftsfuehrer}</Text> : null,
          co.director,
          null,
          hasSeat ? <Text style={s.bold}>{L.sitz}</Text> : null,
          co.streetLine || null,
          co.cityLine || null,
        ]}
      />
      <FooterColumn
        left={col2}
        width={col3 - col2 - 8}
        slots={[
          contact[0] ?? null,
          contact[1] ?? null,
          contact[2] ?? null,
          null,
          null,
          <>
            {`${L.seite} `}
            <Text style={s.bold}>{pageNumber}</Text>
            {` ${L.von} `}
            <Text style={s.bold}>{pageCount}</Text>
          </>,
        ]}
      />
      <FooterColumn
        left={col3}
        width={565 - col3}
        slots={[
          hasBank ? (
            <>
              <Text style={s.bold}>{L.bankverbindung}</Text>
              {payment.bankName ? ` ${payment.bankName}` : ""}
            </>
          ) : null,
          payment.iban ? <LabelValue label={L.iban} value={payment.iban} /> : null,
          payment.bic ? <LabelValue label={L.bic} value={payment.bic} /> : null,
          null,
          <LabelValue key="tax" label={`${co.taxIdLabel}:`} value={co.taxIdValue} boldValue />,
          null,
        ]}
      />
    </View>
  );
}
