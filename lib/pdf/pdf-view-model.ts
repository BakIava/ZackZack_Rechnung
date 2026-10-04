/**
 * View-Model der Vorlage `standard`: reine Präsentationsabbildung der
 * normalisierten Renderdaten (lib/pdf/render-data.ts) auf Zeilen und Felder des
 * Standard-Layouts. Hier wird NICHT gerechnet und NICHT formatiert — Beträge,
 * Daten, §19-/USt.-Ausweis und Zahlungsziel kommen fertig aus den Renderdaten.
 * Diese Datei setzt nur Zeilen zusammen (Trenner, „Tel.“, „Inhaber“) und blendet
 * Felder für das Standard-Layout ein oder aus.
 *
 * Harte Regeln bleiben dadurch erhalten: kein Einkaufspreis/keine Marge (existiert
 * in den Renderdaten nicht), §19-Hinweis und Steuerzeilen exakt wie in den
 * Renderdaten entschieden, Dokument immer Deutsch.
 */

import { DOKUMENT_DE } from "@/lib/documents/document-de";
import { joinText } from "@/lib/pdf/join-text";
import type { DocumentRenderData } from "@/lib/pdf/render-data";

export interface PdfRow {
  position: number;
  descriptionDe: string;
  additionalDescriptionDe: string | null;
  mengeText: string;
  unitPriceText: string;
  /** Netto-Zeilensumme in Cent für seitenbezogene Zwischensummen. */
  totalAmount: number;
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
  serviceTimingLabel: string | null;
  serviceTimingValue: string | null;
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

export function buildPdfViewModel(data: DocumentRenderData): PdfViewModel {
  const { document: doc, dates, company: co, customer: rc, tax, totals, payment } = data;
  const showTaxDetails = tax.showTaxDetails;

  return {
    isRechnung: doc.isInvoice,
    monogram: data.logo.monogram,
    companyName: co.name,
    companyAddressLine: joinText([co.streetLine, co.cityLine], " · "),
    companyContactLine: joinText(
      [co.phone ? `Tel. ${co.phone}` : null, co.email],
      " · ",
    ),

    senderLine: joinText([co.name, co.streetLine, co.cityLine], " · "),
    empfaengerLabel: doc.recipientLabel,
    recipientName: rc.name,
    recipientStreetLine: rc.streetLine,
    recipientCityLine: rc.cityLine,

    numberLabel: doc.numberLabel,
    numberValue: doc.numberText,
    isDraftNumber: doc.isDraftNumber,
    dateValue: dates.issueDateText,
    serviceTimingLabel: dates.serviceTiming?.label ?? null,
    serviceTimingValue: dates.serviceTiming?.value ?? null,
    validUntilValue: dates.validUntilText,
    steuerLabel: co.taxIdLabel,
    steuerValue: co.taxIdValue,

    title: doc.title,
    rows: data.items.map((item) => ({
      position: item.position,
      descriptionDe: item.descriptionDe,
      additionalDescriptionDe: item.additionalDescriptionDe,
      mengeText: item.quantityText,
      unitPriceText: item.unitPriceText,
      totalAmount: item.totalAmount,
      totalText: item.totalAmountText,
      taxRateText: showTaxDetails ? item.taxRateText : "",
    })),

    gesamtNettoLabel: DOKUMENT_DE.gesamtNetto,
    netTotalText: totals.netAmountText,
    showTaxDetails,
    taxLines: showTaxDetails
      ? totals.taxGroups.map((group) => ({
          label: group.label,
          amountText: group.taxAmountText,
        }))
      : [],
    sumLabel: doc.sumLabel,
    totalText: totals.grossAmountText,

    showKleinunternehmerHinweis: tax.showKleinunternehmerHinweis,
    kleinunternehmerHinweis: tax.kleinunternehmerHinweis,

    paymentText: payment.termsText,
    bankLine:
      joinText(
        [payment.bankName, payment.iban ? `${DOKUMENT_DE.iban} ${payment.iban}` : null],
        " · ",
      ) || null,
    closingText: doc.closingText,

    footerCompanyName: co.name,
    footerOwnerLine: co.director
      ? `${co.director}, ${DOKUMENT_DE.inhaber}`
      : null,
    footerAddressLine: joinText([co.streetLine, co.cityLine], ", "),
    footerContactPhone: co.phone ? `Tel. ${co.phone}` : null,
    footerContactEmail: co.email,
    footerBankName: payment.bankName,
  };
}
