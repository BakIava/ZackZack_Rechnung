/**
 * Formen der normalisierten, vorlagenunabhängigen Renderdaten (siehe
 * render-data.ts für Ableitung und harte Regeln). Reine Typen — Vorlagen
 * importieren sie, um die Daten zu konsumieren.
 */

import type { PdfLogo } from "@/lib/pdf/pdf-logo";
import type { PreviewCompany } from "@/types/company";
import type { PreviewCustomer } from "@/types/customer";
import type {
  DocStatus,
  DocType,
  DocumentItem,
  TaxGroup,
  TaxRate,
} from "@/types/document";

export interface RenderDocumentInfo {
  id: string;
  docType: DocType;
  isInvoice: boolean;
  status: DocStatus;
  /** Vergebene Nummer; null, solange der Beleg ein Entwurf ist. */
  number: string | null;
  /** Nummer oder Entwurf-Platzhalter. */
  numberText: string;
  isDraftNumber: boolean;
  /** „Rechnung“ bzw. „Angebot“. */
  typeLabel: string;
  numberLabel: string;
  /** „Rechnung R-2026-041“; ohne Nummer nur der Typ. */
  title: string;
  recipientLabel: string;
  sumLabel: string;
  closingText: string;
}

export interface RenderServiceTiming {
  label: string;
  value: string;
}

export interface RenderDates {
  issueDate: string | null;
  /** TT.MM.JJJJ oder „—“. */
  issueDateText: string;
  serviceTiming: RenderServiceTiming | null;
  /** Nur Angebote. */
  validUntil: string | null;
  validUntilText: string | null;
}

/** Verkäuferdaten; Bank und Zahlungsziel liegen unter `payment`, das Logo unter `logo`. */
export type RenderCompany = Omit<
  PreviewCompany,
  "logoUrl" | "paymentDays" | "bankName" | "iban" | "bic" | "accountHolder"
> & {
  /** „Musterstraße 12“ */
  streetLine: string;
  /** „10115 Berlin“ */
  cityLine: string;
  /** Steuernummer hat Vorrang vor der USt-IdNr. */
  taxIdLabel: string;
  /** Steuernummer, sonst USt-IdNr., sonst „—“. */
  taxIdValue: string;
};

export interface RenderCustomer {
  /** Eingefrorener Empfänger-Snapshot; null ohne gewählten Kunden. */
  snapshot: PreviewCustomer | null;
  /** Leer, wenn kein Empfänger vorhanden ist. */
  name: string;
  streetLine: string;
  cityLine: string;
  /** Vor- und Nachname der Kontaktperson — nur bei Firmenkunden, sonst null. */
  contactPersonName: string | null;
  /** Telefonnummer aus dem Snapshot; null, wenn keine hinterlegt ist. */
  phone: string | null;
}

export type RenderItem = Omit<DocumentItem, "additionalDescriptionDe"> & {
  additionalDescriptionDe: string | null;
  /** Menge + Einheit, z. B. „2.5 Eimer“. */
  quantityText: string;
  /** Menge allein mit zwei Nachkommastellen, z. B. „1,00“. */
  amountDecimalText: string;
  unitPriceText: string;
  /** Ohne Währungszeichen, z. B. „39,00“. */
  unitPriceDecimalText: string;
  /** Netto-Zeilensumme. */
  totalAmountText: string;
  totalAmountDecimalText: string;
  /** Effektiver Satz, z. B. „19 %“ — sichtbar nur bei `tax.showTaxDetails`. */
  taxRateText: string;
};

export interface RenderTaxGroup extends TaxGroup {
  /** „Umsatzsteuer 19 %“ */
  label: string;
  /** Satz mit zwei Nachkommastellen, z. B. „19,00“. */
  rateDecimalText: string;
  netAmountText: string;
  netAmountDecimalText: string;
  taxAmountText: string;
  taxAmountDecimalText: string;
}

export interface RenderTotals {
  netAmount: number;
  netAmountText: string;
  netAmountDecimalText: string;
  taxAmount: number;
  taxAmountText: string;
  taxAmountDecimalText: string;
  /** Bei §19 ohne Steuerausweis identisch mit `netAmount`. */
  grossAmount: number;
  grossAmountText: string;
  grossAmountDecimalText: string;
  /** Absteigend nach Satz sortiert, wie im Snapshot. */
  taxGroups: RenderTaxGroup[];
}

export interface RenderTax {
  isKleinunternehmer: boolean;
  defaultTaxRate: TaxRate;
  /** USt.-Spalte, Netto-Summe und Steuerzeilen ausweisen. */
  showTaxDetails: boolean;
  showKleinunternehmerHinweis: boolean;
  /** Exakter §19-Hinweis; erscheint nur bei `showKleinunternehmerHinweis`. */
  kleinunternehmerHinweis: string;
}

export interface RenderPayment {
  paymentDays: number;
  /** Nur Rechnungen mit Ausstellungsdatum. */
  dueDate: string | null;
  dueDateText: string | null;
  /** Zahlungsziel-Satz; nur Rechnungen mit Ausstellungsdatum. */
  termsText: string | null;
  bankName: string | null;
  iban: string | null;
  bic: string | null;
  accountHolder: string | null;
}

export interface RenderLogo {
  /** Serverseitig aufbereitetes Rasterlogo; null → Monogramm. */
  image: PdfLogo | null;
  monogram: string;
  /** Anfangsbuchstaben aller Namenswörter als Wortmarke, z. B. „THS“. */
  initials: string;
}

export interface DocumentRenderData {
  document: RenderDocumentInfo;
  dates: RenderDates;
  company: RenderCompany;
  customer: RenderCustomer;
  items: RenderItem[];
  totals: RenderTotals;
  tax: RenderTax;
  payment: RenderPayment;
  logo: RenderLogo;
}
