/**
 * Reines View-Model für den PDF-Beleg. Leitet aus dem eingefrorenen
 * DocumentPreview alle darstellbaren Werte ab — IMMER Deutsch, reine
 * Kundensicht. Ohne React/Supabase, damit die harten Regeln testbar bleiben:
 *
 *  - Einkaufspreis/Marge existieren im DTO nicht und tauchen hier nie auf
 *    (nur `unitPrice` = Verkaufspreis geht in die Zeile).
 *  - §19-Kleinunternehmer: keine USt., stattdessen automatischer §19-Hinweis.
 *  - Empfänger stammt aus dem Snapshot (der Aufrufer liest nie live).
 *  - Beträge/Datum deutsch formatiert (de-DE).
 *
 * Dieselbe Wahrheit wie die HTML-Vorschau (DocumentA4): gleiche Labels aus
 * DOKUMENT_DE, gleiche Formatter → Bildschirm und PDF bleiben deckungsgleich.
 */

import { formatDateDE, formatMoney } from "@/lib/format";
import {
  DOKUMENT_DE,
  dokumentAbschlussText,
  zahlungszielText,
} from "@/lib/documents/document-de";
import type { DocumentPreview } from "@/types/document";
import { deriveCompanyMonogram } from "../initials";
import { getCustomerName } from "../customers/utils";
import { shouldShowTaxDetails } from "../documents/tax";

export interface PdfRow {
  position: number;
  descriptionDe: string;
  mengeText: string;
  unitPriceText: string;
  totalText: string;
  taxRateText: string;
}

export interface PdfTaxLine {
  label: string;
  amountText: string;
}

export interface PdfViewModel {
  isRechnung: boolean;
  /** Firmen-Monogramm als Logo-Fallback (kein Bild vorhanden). */
  monogram: string;

  companyName: string;
  companyAddressLine: string;
  companyContactLine: string;

  senderLine: string;
  empfaengerLabel: string;
  recipientName: string;
  recipientStreetLine: string;
  recipientCityLine: string;

  numberLabel: string;
  numberValue: string;
  isDraftNumber: boolean;
  dateValue: string;
  serviceDateValue: string | null;
  validUntilValue: string | null;
  steuerLabel: string;
  steuerValue: string;

  title: string;
  rows: PdfRow[];

  gesamtNettoLabel: string;
  netTotalText: string;
  showTaxDetails: boolean;
  taxLines: PdfTaxLine[];
  sumLabel: string;
  totalText: string;

  showKleinunternehmerHinweis: boolean;
  kleinunternehmerHinweis: string;

  /** Nur bei Rechnung mit Ausstellungsdatum. */
  paymentText: string | null;
  bankLine: string | null;
  closingText: string;

  footerCompanyName: string;
  footerOwnerLine: string | null;
  footerAddressLine: string;
  footerContactPhone: string | null;
  footerContactEmail: string | null;
  footerBankName: string | null;
}

function joinTrim(parts: (string | null | undefined)[], sep: string): string {
  return parts
    .map((p) => (p ?? "").trim())
    .filter(Boolean)
    .join(sep);
}

export function buildPdfViewModel(preview: DocumentPreview): PdfViewModel {
  const { company: co, customer: rc, docType, isKleinunternehmer } = preview;
  const isRechnung = docType === "invoice";
  const showTaxDetails = shouldShowTaxDetails(isKleinunternehmer, preview.items);

  // Summe strikt aus den Zeilen (Verkaufspreis) — nie aus internen Feldern.
  const coStreet = joinTrim([co.street, co.streetNo], " ");
  const coCity = joinTrim([co.postcode, co.city], " ");
  const rcStreet = rc ? joinTrim([rc.street, rc.streetNo], " ") : "";
  const rcCity = rc ? joinTrim([rc.postcode, rc.city], " ") : "";

  const steuerLabel = co.steuernummer
    ? DOKUMENT_DE.steuerNr
    : DOKUMENT_DE.ustId;
  const steuerValue = co.steuernummer ?? co.ustId ?? "—";

  const numberLabel = isRechnung
    ? DOKUMENT_DE.rechnungNr
    : DOKUMENT_DE.angebotNr;
  const titleWort = isRechnung ? DOKUMENT_DE.rechnung : DOKUMENT_DE.angebot;

  const bankLine =
    joinTrim(
      [co.bankName, co.iban ? `${DOKUMENT_DE.iban} ${co.iban}` : null],
      " · ",
    ) || null;

  const paymentText =
    isRechnung && preview.issueDate
      ? zahlungszielText(preview.issueDate, co.paymentDays)
      : null;

  return {
    isRechnung,
    monogram: deriveCompanyMonogram(co.name),

    companyName: co.name,
    companyAddressLine: joinTrim([coStreet, coCity], " · "),
    companyContactLine: joinTrim(
      [co.phone ? `Tel. ${co.phone}` : null, co.email],
      " · ",
    ),

    senderLine: joinTrim([co.name, coStreet, coCity], " · "),
    empfaengerLabel: isRechnung
      ? DOKUMENT_DE.empfaengerRechnung
      : DOKUMENT_DE.empfaengerAngebot,
    recipientName: getCustomerName(rc),
    recipientStreetLine: rcStreet,
    recipientCityLine: rcCity,

    numberLabel,
    numberValue: preview.documentNumber ?? DOKUMENT_DE.entwurfPlatzhalter,
    isDraftNumber: !preview.documentNumber,
    dateValue: preview.issueDate ? formatDateDE(preview.issueDate) : "—",
    serviceDateValue: preview.serviceDate
      ? formatDateDE(preview.serviceDate)
      : null,
    validUntilValue: !isRechnung && preview.validUntil
      ? formatDateDE(preview.validUntil)
      : null,
    steuerLabel,
    steuerValue,

    title: `${titleWort}${preview.documentNumber ? ` ${preview.documentNumber}` : ""}`,
    rows: preview.items.map((p) => ({
      position: p.position,
      descriptionDe: p.descriptionDe,
      mengeText: joinTrim([String(p.amount), p.unit], " "),
      unitPriceText: formatMoney(p.unitPrice),
      totalText: formatMoney(p.totalAmount),
      taxRateText: showTaxDetails ? `${p.taxRate} %` : "",
    })),

    gesamtNettoLabel: DOKUMENT_DE.gesamtNetto,
    netTotalText: formatMoney(preview.netAmount),
    showTaxDetails,
    taxLines: showTaxDetails
      ? preview.taxGroups.map((group) => ({
          label: `${DOKUMENT_DE.umsatzsteuer} ${group.rate} %`,
          amountText: formatMoney(group.taxAmount),
        }))
      : [],
    sumLabel: isRechnung
      ? DOKUMENT_DE.rechnungsbetrag
      : DOKUMENT_DE.angebotssumme,
    totalText: formatMoney(preview.totalAmount),

    showKleinunternehmerHinweis: isKleinunternehmer && !showTaxDetails,
    kleinunternehmerHinweis: DOKUMENT_DE.kleinunternehmerHinweis,

    paymentText,
    bankLine,
    closingText: dokumentAbschlussText(docType),

    footerCompanyName: co.name,
    footerOwnerLine: co.director
      ? `${co.director}, ${DOKUMENT_DE.inhaber}`
      : null,
    footerAddressLine: joinTrim([coStreet, coCity], ", "),
    footerContactPhone: co.phone ? `Tel. ${co.phone}` : null,
    footerContactEmail: co.email,
    footerBankName: co.bankName,
  };
}
