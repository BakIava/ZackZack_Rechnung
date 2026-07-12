/**
 * Kunden-Typen — alle abgeleitet aus `CustomerDbRow` (types/database.ts).
 * Keine erneute Felddefinition außerhalb dieser Datei.
 */

import type { CustomerDbRow, CustomerType, DocType } from "./database";

/** Dokument-Zeile im Kunden-Detail (Join `customers → documents`). */
export interface CustomerDocRow {
  id: string;
  document_type: DocType;
  document_number: string | null;
  status: string;
  total_amount: number;
  issue_date: string;
}

/** Kundenliste inkl. Dokumente-Join (Kunden-Seite) — Spalten wie im SELECT. */
export type CustomerRow = Pick<
  CustomerDbRow,
  | "id"
  | "customer_type"
  | "firstname"
  | "lastname"
  | "company_name"
  | "street"
  | "street_no"
  | "postcode"
  | "city"
  | "email"
  | "phone"
  | "notes"
  | "customer_number"
  | "created_at"
> & {
  documents: CustomerDocRow[];
};

export interface CustomerMutationResult {
  error?: string;
  id?: string;
}

/** Schlanke Auswahlliste (Schritt 1 – Kundenauswahl). */
export interface CustomerListItem {
  id: string;
  firstname: string | null;
  lastname: string | null;
  companyName: string | null;
  city: string | null;
  street: string | null;
  initials: string;
  isNew?: boolean;
}

/** Vollständige, bearbeitbare Kundendaten (für den Edit-Modus im Flow-Modal). */
export interface FlowCustomer {
  id: string;
  customer_type: CustomerType;
  firstname: string | null;
  lastname: string | null;
  company_name: string | null;
  street: string | null;
  streetNo: string | null;
  postcode: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
}

/** Aktuelle Kundendaten zum Anreichern einer Dokumentenliste. */
export type DocumentCustomer = Omit<FlowCustomer, "notes">;

/** Formulareingabe für Anlegen/Bearbeiten eines Kunden. */
export interface CustomerInput {
  customerType: CustomerType;
  firstname: string | null;
  lastname: string | null;
  companyName: string | null;
  street?: string;
  streetNo?: string;
  postcode?: string;
  city?: string;
  phone?: string;
  email?: string;
  notes?: string;
}

/**
 * Eingefrorene Kundenkopie im Dokument (jsonb `documents.customer_snapshot`).
 * Nie als Live-Join – immer Kopie; Feldnamen wie in der DB (snake_case).
 */
export type CustomerSnapshot = Pick<
  CustomerDbRow,
  | "customer_type"
  | "firstname"
  | "lastname"
  | "company_name"
  | "street"
  | "street_no"
  | "postcode"
  | "city"
  | "email"
  | "phone"
>;

/**
 * Empfänger auf der Dokument-Vorschau – IMMER aus `customer_snapshot`,
 * nie Live-Join. E-Mail/Telefon nur fürs Teilen, NICHT für den Beleg.
 */
export interface PreviewCustomer {
  customer_type: CustomerType;
  firstname: string | null;
  lastname: string | null;
  company_name: string | null;
  street: string | null;
  streetNo: string | null;
  postcode: string | null;
  city: string | null;
  email: string | null;
  phone: string | null;
}