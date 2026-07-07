/**
 * Handgeschriebene Row-Typen des Supabase-Schemas — Single Source of Truth für
 * alle Entitäts-Typen der App. Abgeleitet aus den im Code verwendeten Spalten
 * und den SQL-Funktionen unter `scripts/` (das Schema selbst wird im
 * Supabase-Dashboard gepflegt; generierte Typen existieren nicht im Repo).
 *
 * UI-/View-Typen bauen per `Pick`/Ableitung hierauf auf (siehe
 * `types/document.ts`, `types/customer.ts`, `types/company.ts`,
 * `types/service.ts`) — Entitätsfelder werden nirgendwo erneut definiert.
 *
 * Offener Punkt: sobald Zugriff auf das Supabase-Projekt besteht, durch
 * `supabase gen types typescript` ersetzen.
 */

/** documents.document_type */
export type DocType = "offer" | "invoice";

/** documents.status */
export type DocStatus = "draft" | "finalized" | "sent" | "paid" | "cancelled";

/** document_items.surcharge_type — Fremdleistungs-Aufschlag (strikt intern) */
export type SurchargeType = "percent" | "fixed";

/** public.companies */
export interface CompanyRow {
  id: string;
  name: string;
  legal_form: string;
  director: string | null;
  street: string;
  street_no: string;
  postcode: string;
  city: string;
  phone: string | null;
  mobile: string | null;
  fax: string | null;
  email: string | null;
  steuernummer: string;
  ust_id: string | null;
  registergericht: string | null;
  handelsregister_nr: string | null;
  /** Kleinunternehmer §19 UStG */
  kleinunternehmer: boolean;
  bank_name: string | null;
  iban: string | null;
  bic: string | null;
  account_holder: string | null;
  logo_url: string | null;
  payment_days: number;
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
  notes: string | null;
  customer_number: number;
  created_at: string;
}

/**
 * public.documents — `document_number` wird erst bei der Finalisierung vergeben
 * (lückenlos, via RPC `finalize_document`), nie beim Anlegen des Entwurfs.
 */
export interface DocumentRow {
  id: string;
  company_id: string;
  created_by: string;
  customer_id: string | null;
  document_type: DocType;
  status: DocStatus;
  document_number: string | null;
  issue_date: string | null; // YYYY-MM-DD
  service_date: string | null; // YYYY-MM-DD
  paid_at: string | null; // ISO timestamp
  is_kleinunternehmer: boolean;
  /** Eingefrorene Empfängerkopie (jsonb) – nie als Live-Join. */
  customer_snapshot: unknown;
  total_amount: number; // cents
  created_at: string;
}

/**
 * public.document_items — Geld in ganzzahligen Cents.
 * purchase_price/surcharge/surcharge_type sind STRIKT INTERN (Fremdleistung)
 * und dürfen niemals aufs Dokument/PDF gelangen.
 */
export interface DocumentItemRow {
  id: string;
  company_id: string;
  document_id: string;
  service_id: string | null;
  position: number;
  description_de: string;
  amount: number;
  unit: string;
  unit_price: number; // cents – Verkaufspreis
  total_amount: number; // cents
  purchase_price: number | null; // cents – intern
  surcharge: number | null; // percent: Basispunkte; fixed: cents – intern
  surcharge_type: SurchargeType | null; // intern
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
}

/** public.users — Verknüpfung Auth-User ↔ Firma */
export interface UserRow {
  id: string;
  company_id: string;
  email: string | null;
}

/**
 * public.number_sequences — eine Zeile pro Firma/Dokumenttyp/Jahr.
 * `last_number` wird ausschließlich von der SQL-Funktion
 * `get_next_document_number` innerhalb von `finalize_document` erhöht.
 */
export interface NumberSequenceRow {
  company_id: string;
  document_type: DocType;
  year: number;
  last_number: number;
}
