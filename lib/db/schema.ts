/**
 * Placeholder schema for Supabase / Postgres.
 * Invoice numbers are allocated per business + year via a dedicated sequence row
 * so numbers stay consecutive without gaps (use SELECT … FOR UPDATE in a transaction).
 */

export type BusinessProfile = {
  id: string;
  owner_user_id: string;
  name: string;
  address: string;
  tax_id: string | null;
  /** Kleinunternehmer §19 UStG */
  small_business_exempt: boolean;
  created_at: string;
};

export type Customer = {
  id: string;
  business_id: string;
  name: string;
  address: string;
  email: string | null;
  phone: string | null;
  created_at: string;
};

export type CatalogItem = {
  id: string;
  business_id: string;
  title: string;
  unit: string;
  unit_price_cents: number;
  created_at: string;
};

export type DocumentType = "invoice" | "quote";

export type DocumentStatus = "draft" | "finalized" | "sent" | "paid" | "cancelled";

export type Document = {
  id: string;
  business_id: string;
  customer_id: string;
  type: DocumentType;
  status: DocumentStatus;
  /** Assigned only when status becomes final – never reuse numbers. */
  invoice_number: string | null;
  issue_date: string;
  due_date: string | null;
  /** Always German content regardless of UI locale */
  document_locale: "de";
  subtotal_cents: number;
  total_cents: number;
  created_at: string;
};

/**
 * One row per business per calendar year.
 * Increment last_number inside a transaction when finalising a document.
 */
export type InvoiceNumberSequence = {
  business_id: string;
  year: number;
  last_number: number;
  updated_at: string;
};
