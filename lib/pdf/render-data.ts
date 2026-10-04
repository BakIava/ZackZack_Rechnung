/**
 * Normalisierte, vorlagenunabhängige Renderdaten eines Belegs (Rechnung und
 * Angebot) — IMMER Deutsch, reine Kundensicht.
 *
 * Hier und nur hier werden aus dem eingefrorenen DocumentPreview alle
 * darstellbaren Werte abgeleitet: §19-/USt.-Ausweis, Zahlungsziel und
 * Fälligkeit, Leistungsangabe, deutsche Geld- und Datumsformate sowie die
 * dokumenttypabhängigen Pflichtbeschriftungen. Vorlagen (lib/pdf/templates)
 * konsumieren diese Daten nur: sie rechnen nicht, formatieren keine Beträge oder
 * Daten und lesen nie aus der Datenbank.
 *
 * Harte Regeln:
 *  - Summen und Steuergruppen werden 1:1 aus dem Snapshot übernommen, nie neu
 *    berechnet (Quelle: lib/documents/tax.ts bzw. finalize_document).
 *  - Einkaufspreis/Marge existieren im Eingabe-DTO nicht und damit auch hier nicht.
 *  - Empfänger stammt ausschließlich aus dem Snapshot.
 *  - Deterministisch: gleiche Eingabe → gleiche Daten, keine Zeit-/Zufallswerte.
 */

import {
  formatDateDE,
  formatDecimal,
  formatMoney,
  formatQuantityDecimal,
  formatRateDecimal,
} from "@/lib/format";
import {
  DOKUMENT_DE,
  dokumentAbschlussText,
  faelligkeitsdatum,
  serviceTimingDisplay,
  zahlungszielText,
} from "@/lib/documents/document-de";
import { shouldShowTaxDetails } from "@/lib/documents/tax";
import { getCustomerName } from "@/lib/customers/utils";
import { deriveCompanyInitials, deriveCompanyMonogram } from "@/lib/initials";
import { joinText } from "@/lib/pdf/join-text";
import type { PdfLogo } from "@/lib/pdf/pdf-logo";
import type { DocumentPreview } from "@/types/document";
import type { DocumentRenderData } from "@/lib/pdf/render-data-types";

export type {
  DocumentRenderData,
  RenderCompany,
  RenderCustomer,
  RenderDates,
  RenderDocumentInfo,
  RenderItem,
  RenderLogo,
  RenderPayment,
  RenderServiceTiming,
  RenderTax,
  RenderTaxGroup,
  RenderTotals,
} from "@/lib/pdf/render-data-types";

export function buildDocumentRenderData(
  preview: DocumentPreview,
  logo: PdfLogo | null,
): DocumentRenderData {
  const { company: co, customer: rc, docType, isKleinunternehmer } = preview;
  const isInvoice = docType === "invoice";
  const showTaxDetails = shouldShowTaxDetails(isKleinunternehmer, preview.items);
  const typeLabel = isInvoice ? DOKUMENT_DE.rechnung : DOKUMENT_DE.angebot;
  const hasPaymentTerms = isInvoice && Boolean(preview.issueDate);
  const dueDate = hasPaymentTerms
    ? faelligkeitsdatum(preview.issueDate as string, co.paymentDays)
    : null;
  const validUntil = !isInvoice ? preview.validUntil : null;

  return {
    document: {
      id: preview.id,
      docType,
      isInvoice,
      status: preview.status,
      number: preview.documentNumber,
      numberText: preview.documentNumber ?? DOKUMENT_DE.entwurfPlatzhalter,
      isDraftNumber: !preview.documentNumber,
      typeLabel,
      numberLabel: isInvoice ? DOKUMENT_DE.rechnungNr : DOKUMENT_DE.angebotNr,
      title: `${typeLabel}${preview.documentNumber ? ` ${preview.documentNumber}` : ""}`,
      recipientLabel: isInvoice
        ? DOKUMENT_DE.empfaengerRechnung
        : DOKUMENT_DE.empfaengerAngebot,
      sumLabel: isInvoice ? DOKUMENT_DE.rechnungsbetrag : DOKUMENT_DE.angebotssumme,
      closingText: dokumentAbschlussText(docType),
    },
    dates: {
      issueDate: preview.issueDate,
      issueDateText: preview.issueDate ? formatDateDE(preview.issueDate) : "—",
      serviceTiming: serviceTimingDisplay(preview),
      validUntil,
      validUntilText: validUntil ? formatDateDE(validUntil) : null,
    },
    company: {
      name: co.name,
      legalForm: co.legalForm,
      street: co.street,
      streetNo: co.streetNo,
      postcode: co.postcode,
      city: co.city,
      phone: co.phone,
      mobile: co.mobile,
      fax: co.fax,
      email: co.email,
      director: co.director,
      steuernummer: co.steuernummer,
      ustId: co.ustId,
      streetLine: joinText([co.street, co.streetNo], " "),
      cityLine: joinText([co.postcode, co.city], " "),
      taxIdLabel: co.steuernummer ? DOKUMENT_DE.steuerNr : DOKUMENT_DE.ustId,
      taxIdValue: co.steuernummer ?? co.ustId ?? "—",
    },
    customer: {
      snapshot: rc,
      name: getCustomerName(rc),
      streetLine: rc ? joinText([rc.street, rc.streetNo], " ") : "",
      cityLine: rc ? joinText([rc.postcode, rc.city], " ") : "",
      contactPersonName:
        rc?.customer_type === "business"
          ? joinText([rc.firstname, rc.lastname], " ") || null
          : null,
      phone: joinText([rc?.phone], "") || null,
    },
    items: preview.items.map((item) => ({
      position: item.position,
      descriptionDe: item.descriptionDe,
      additionalDescriptionDe: item.additionalDescriptionDe ?? null,
      amount: item.amount,
      unit: item.unit,
      unitPrice: item.unitPrice,
      totalAmount: item.totalAmount,
      taxRate: item.taxRate,
      taxAmount: item.taxAmount,
      grossAmount: item.grossAmount,
      quantityText: joinText([String(item.amount), item.unit], " "),
      amountDecimalText: formatQuantityDecimal(item.amount),
      unitPriceText: formatMoney(item.unitPrice),
      unitPriceDecimalText: formatDecimal(item.unitPrice),
      totalAmountText: formatMoney(item.totalAmount),
      totalAmountDecimalText: formatDecimal(item.totalAmount),
      taxRateText: `${item.taxRate} %`,
    })),
    totals: {
      netAmount: preview.netAmount,
      netAmountText: formatMoney(preview.netAmount),
      netAmountDecimalText: formatDecimal(preview.netAmount),
      taxAmount: preview.taxAmount,
      taxAmountText: formatMoney(preview.taxAmount),
      taxAmountDecimalText: formatDecimal(preview.taxAmount),
      grossAmount: preview.totalAmount,
      grossAmountText: formatMoney(preview.totalAmount),
      grossAmountDecimalText: formatDecimal(preview.totalAmount),
      taxGroups: preview.taxGroups.map((group) => ({
        ...group,
        label: `${DOKUMENT_DE.umsatzsteuer} ${group.rate} %`,
        rateDecimalText: formatRateDecimal(group.rate),
        netAmountText: formatMoney(group.netAmount),
        netAmountDecimalText: formatDecimal(group.netAmount),
        taxAmountText: formatMoney(group.taxAmount),
        taxAmountDecimalText: formatDecimal(group.taxAmount),
      })),
    },
    tax: {
      isKleinunternehmer,
      defaultTaxRate: preview.defaultTaxRate,
      showTaxDetails,
      showKleinunternehmerHinweis: isKleinunternehmer && !showTaxDetails,
      kleinunternehmerHinweis: DOKUMENT_DE.kleinunternehmerHinweis,
    },
    payment: {
      paymentDays: co.paymentDays,
      dueDate,
      dueDateText: dueDate ? formatDateDE(dueDate) : null,
      termsText: hasPaymentTerms
        ? zahlungszielText(preview.issueDate as string, co.paymentDays)
        : null,
      bankName: co.bankName,
      iban: co.iban,
      bic: co.bic,
      accountHolder: co.accountHolder,
    },
    logo: {
      image: logo,
      monogram: deriveCompanyMonogram(co.name),
      initials: deriveCompanyInitials(co.name),
    },
  };
}
