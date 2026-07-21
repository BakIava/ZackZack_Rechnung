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

/** document_relations.relation_type */
export type DocumentRelationType = "converted_to_invoice" | "based_on_quote";

/** document_items.surcharge_type — Fremdleistungs-Aufschlag (strikt intern) */
export type SurchargeType = "percent" | "fixed";

/** Unterstützte Umsatzsteuersätze in Prozent. */
export type TaxRate = 0 | 7 | 19;

export type CustomerType = "private" | "business";

/** Stabile, sprachunabhängige IDs der im MVP unterstützten Gewerke. */
export const TRADE_IDS = [
  "painter",
  "carpenter",
  "windows_doors",
  "electrician",
  "tiler",
  "plumbing_heating",
  "drywall",
  "flooring",
  "gardening_landscaping",
  "cleaning",
  "other",
] as const;

export type TradeId = (typeof TRADE_IDS)[number];

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
  /** Standard-USt.-Satz; bleibt auch bei §19 für einen späteren Statuswechsel erhalten. */
  default_tax_rate: TaxRate;
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

/** public.ai_usage_daily — atomare KI-Tagesquote pro Auth-User und UTC-Tag */
export interface AiUsageDailyRow {
  user_id: string;
  usage_date: string;
  request_count: number;
  created_at: string;
  updated_at: string;
}

/** public.onboarding_ai_usage_daily — Quote vor Anlage der public.users-Zeile. */
export interface OnboardingAiUsageDailyRow {
  user_id: string;
  usage_date: string;
  request_count: number;
  created_at: string;
  updated_at: string;
}

/** public.customers */
export interface CustomerDbRow {
  id: string;
  company_id: string | null;
  customer_type: CustomerType;
  firstname: string | null;
  lastname: string | null;
  company_name: string | null;
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
  /** Herkunft einer kopierten Starterleistung; manuelle Einträge bleiben null. */
  starter_template_id: string | null;
  created_at: string;
  updated_at: string;
}

/** public.trades — zentrale technische Gewerk-IDs, Labels bleiben in i18n. */
export interface TradeRow {
  id: TradeId;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** public.company_trades — Mehrfachauswahl einer Firma im Onboarding. */
export interface CompanyTradeRow {
  company_id: string;
  trade_id: TradeId;
  created_at: string;
}

/** public.service_templates — zentral gepflegte, unveränderlich kopierte Vorlagen. */
export interface ServiceTemplateRow {
  id: string;
  trade_id: TradeId;
  description_de: string;
  description_tr: string;
  description_ar: string;
  unit: string;
  default_price: number;
  category: string | null;
  sort_order: number;
  is_active: boolean;
  template_version: number;
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
  service_period_start: string | null; // date, YYYY-MM-DD
  service_period_end: string | null; // date, YYYY-MM-DD
  /** Nur fuer Angebote; Standard = ein Kalendermonat ab issue_date. */
  valid_until: string | null; // date, YYYY-MM-DD
  /** Eingefrorene Empfängerkopie (jsonb, nullable) – nie als Live-Join. */
  customer_snapshot: unknown;
  total_amount: number; // cents, NOT NULL Default 0
  subtotal_amount: number; // cents netto, NOT NULL Default 0
  tax_amount: number; // cents, NOT NULL Default 0
  is_kleinunternehmer: boolean;
  /** Eingefrorener Firmenstandard beim Anlegen des Dokuments. */
  default_tax_rate: TaxRate;
  created_at: string;
  updated_at: string;
  paid_at: string | null; // ISO timestamp
  /** Beim Finalisieren eingefrorene Logo-URL; spätere Firmenänderungen gelten nur für neue Belege. */
  logo_url_snapshot: string | null;
  /** Unterscheidet einen bewusst leeren Snapshot von historischen Zeilen vor der Migration. */
  logo_snapshot_captured: boolean;
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
  tax_rate: TaxRate; // effektiv angewendeter Satz
  tax_rate_overridden: boolean; // false = Dokumentstandard
  tax_amount: number; // cents, auf Zeilenebene gerundet
  gross_amount: number; // cents
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

/** public.document_relations — unveraenderbare Herkunfts-/Umwandlungslinks. */
export interface DocumentRelationRow {
  id: string;
  company_id: string;
  source_document_id: string;
  target_document_id: string;
  relation_type: DocumentRelationType;
  created_at: string;
}
