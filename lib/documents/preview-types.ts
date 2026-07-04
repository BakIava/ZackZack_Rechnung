import type { DbDocumentStatus } from "./types";

/** Firmenstammdaten für den Dokumentkopf (Verkaufssicht, alle Felder Deutsch). */
export interface PreviewCompany {
  name: string;
  legalForm: string | null;
  street: string | null;
  streetNo: string | null;
  postcode: string | null;
  city: string | null;
  phone: string | null;
  mobile: string | null;
  email: string | null;
  director: string | null;
  steuernummer: string | null;
  ustId: string | null;
  bankName: string | null;
  iban: string | null;
  bic: string | null;
  accountHolder: string | null;
  logoUrl: string | null;
  paymentDays: number;
}

/** Eingefrorene Empfängerkopie – IMMER aus customer_snapshot, nie Live-Join. */
export interface PreviewCustomer {
  name: string;
  street: string | null;
  streetNo: string | null;
  postcode: string | null;
  city: string | null;
}

export interface PreviewItem {
  position: number;
  descriptionDe: string;
  amount: number;
  unit: string;
  unitPrice: number; // cents – Verkaufspreis
  totalAmount: number; // cents
}

export interface DocumentPreview {
  id: string;
  docType: "rechnung" | "angebot";
  status: DbDocumentStatus;
  documentNumber: string | null;
  issueDate: string | null; // YYYY-MM-DD
  serviceDate: string | null; // YYYY-MM-DD
  isKleinunternehmer: boolean;
  totalAmount: number; // cents
  company: PreviewCompany;
  customer: PreviewCustomer | null;
  items: PreviewItem[];
}
