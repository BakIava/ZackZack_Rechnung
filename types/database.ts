/**
 * Row-Typen des Supabase-Schemas — Single Source of Truth für alle
 * Entitäts-Typen der App. Abgeglichen mit dem realen Schema-Dump
 * (public.*, Stand 2026-07); Spaltenreihenfolge und Nullability folgen der DB.
 *
 * UI-/View-Typen bauen per `Pick`/Ableitung hierauf auf (siehe
 * `types/document.ts`, `types/customer.ts`, `types/company.ts`,
 * `types/service.ts`) — Entitätsfelder werden nirgendwo erneut definiert.
 *
 * Enum-Werte gegen pg_enum verifiziert (Stand 2026-07):
 * document_type_enum = {invoice, quote}, document_status_enum =
 * {draft, finalized, sent, paid, cancelled}, surcharge_type_enum =
 * {percent, fixed}. Ein früherer App-seitiger Rename auf "offer" war nie in
 * die DB migriert und wurde zurückgenommen — "Angebot" heißt in DB und App
 * `quote`; UI-Labels übersetzen das (Message-Key `quote`).
 *
 * Offener Punkt: sobald CLI-Zugriff auf das Supabase-Projekt besteht, durch
 * `supabase gen types typescript` ersetzen.
 */

/** documents.document_type (document_type_enum) */
export type DocType = "invoice" | "quote";

/** documents.status (document_status_enum) */
export type DocStatus = "draft" | "finalized" | "sent" | "paid" | "cancelled";

/** document_items.surcharge_type — Fremdleistungs-Aufschlag (strikt intern) */
export type SurchargeType = "percent" | "fixed";

/** public.companies */
export interface CompanyRow {
  id: string;
  name: string;
  legal_form: string | null;
  street: string | null;
  street_no: string | null;
  postcode: string | null;
  city: string | null;
  phone: string | null;
  mobile: string | null;
  fax: string | null;
  email: string | null;
  director: string | null;
  steuernummer: string | null;
  ust_id: string | null;
  registergericht: string | null;
  handelsregister_nr: string | null;
  /** Kleinunternehmer §19 UStG (NOT NULL, Default true) */
  kleinunternehmer: boolean;
  bank_name: string | null;
  iban: string | null;
  bic: string | null;
  account_holder: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
  payment_days: number;
}

/** public.users — Verknüpfung Auth-User ↔ Firma (id = auth.users.id) */
export interface UserRow {
  id: string;
  company_id: string;
  email: string;
  created_at: string;
}

/** public.customers */
export interface CustomerDbRow {
  id: string;
  company_id: string;
  name: string;
  street: string | null;
  street_no: string | null;
  postcode: string | null;
  city: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
  notes: string | null;
  /** GENERATED ALWAYS AS IDENTITY */
  customer_number: number;
}

/** public.services — Leistungskatalog (deutscher Begriff + Übersetzungen) */
export interface ServiceDbRow {
  id: string;
  company_id: string;
  description_de: string;
  description_tr: string | null;
  description_ar: string | null;
  unit: string | null;
  default_price: number | null; // cents
  created_at: string;
  updated_at: string;
}

/**
 * public.documents — `document_number` wird erst bei der Finalisierung vergeben
 * (lückenlos, via RPC `finalize_document`), nie beim Anlegen des Entwurfs.
 */
export interface DocumentRow {
  id: string;
  company_id: string;
  customer_id: string | null;
  created_by: string;
  document_type: DocType;
  document_number: string | null;
  status: DocStatus;
  issue_date: string | null; // date, YYYY-MM-DD
  service_date: string | null; // date, YYYY-MM-DD
  /** Eingefrorene Empfängerkopie (jsonb, nullable) – nie als Live-Join. */
  customer_snapshot: unknown;
  total_amount: number; // cents, NOT NULL Default 0
  is_kleinunternehmer: boolean;
  created_at: string;
  updated_at: string;
  paid_at: string | null; // ISO timestamp
}

/**
 * public.document_items — Geld in ganzzahligen Cents.
 * purchase_price/surcharge/surcharge_type sind STRIKT INTERN (Fremdleistung)
 * und dürfen niemals aufs Dokument/PDF gelangen.
 */
export interface DocumentItemRow {
  id: string;
  document_id: string;
  company_id: string;
  service_id: string | null;
  position: number;
  description_de: string;
  amount: number; // numeric
  unit: string | null;
  unit_price: number; // cents – Verkaufspreis
  total_amount: number; // cents
  purchase_price: number | null; // cents – intern
  surcharge: number | null; // percent: Basispunkte; fixed: cents – intern
  surcharge_type: SurchargeType | null; // intern
  created_at: string;
}

/**
 * public.number_sequences — PK (company_id, document_type, year).
 * `last_number` wird ausschließlich von der SQL-Funktion
 * `get_next_document_number` innerhalb von `finalize_document` erhöht.
 */
export interface NumberSequenceRow {
  company_id: string;
  document_type: DocType;
  year: number;
  last_number: number;
}
