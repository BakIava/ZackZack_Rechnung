/**
 * Repository `customers` — einzige Stelle mit Supabase-Zugriff auf die Tabelle
 * `customers` (Server). Komponenten/Pages rufen diese Funktionen bzw. die
 * dünnen Server-Actions in `lib/customers/actions.ts` auf – nie `supabase.from()`.
 */

import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/supabase/auth";
import { deriveInitials } from "@/lib/initials";
import type {
  CustomerInput,
  CustomerListItem,
  CustomerMutationResult,
  CustomerRow,
  CustomerSnapshot,
  DocumentCustomer,
  FlowCustomer,
} from "@/types/customer";

/** Kundenliste inkl. Dokumente-Join (Kunden-Seite), neueste zuerst. */
export async function getCustomers(): Promise<CustomerRow[]> {
  const companyId = await getCurrentCompanyId();
  if (!companyId) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select(
      `id, name, street, street_no, postcode, city, email, phone, notes, customer_number, created_at,
       documents ( id, document_type, document_number, status, total_amount, issue_date )`,
    )
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as CustomerRow[];
}

/** Schlanke Auswahlliste für Schritt 1 (Kundenauswahl), alphabetisch. */
export async function getCustomerSummaries(): Promise<CustomerListItem[]> {
  const companyId = await getCurrentCompanyId();
  if (!companyId) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("id, name, street, street_no, city")
    .eq("company_id", companyId)
    .order("name", { ascending: true });

  if (error || !data) return [];
  return data.map((c) => ({
    id: c.id as string,
    name: c.name as string,
    city: (c.city as string | null) ?? null,
    street: [c.street, c.street_no].filter(Boolean).join(" ") || null,
    initials: deriveInitials(c.name as string),
  }));
}

/**
 * Lädt mehrere Kunden auf einen Schlag (z. B. um eine Dokumentenliste mit
 * aktuellen Kundendaten statt dem eingefrorenen `customer_snapshot` anzureichern),
 * scoped auf die eigene Firma. Fremde/unbekannte IDs werden stillschweigend
 * übersprungen; leere `customerIds` sparen den Roundtrip.
 */
export async function getCustomersByIds(customerIds: string[]): Promise<DocumentCustomer[]> {
  if (customerIds.length === 0) return [];

  const companyId = await getCurrentCompanyId();
  if (!companyId) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("id, name, street, street_no, postcode, city, email, phone")
    .eq("company_id", companyId)
    .in("id", customerIds);
  if (error || !data) return [];

  return data.map((c) => ({
    id: c.id as string,
    name: c.name as string,
    street: (c.street as string | null) ?? null,
    streetNo: (c.street_no as string | null) ?? null,
    postcode: (c.postcode as string | null) ?? null,
    city: (c.city as string | null) ?? null,
    email: (c.email as string | null) ?? null,
    phone: (c.phone as string | null) ?? null,
  }));
}

/**
 * Vollständige Kundendaten für den Edit-Modus im Flow (eigene Firma).
 * Bewusst schlank (kein documents-Join) – nur die bearbeitbaren Felder.
 */
export async function getCustomerForEdit(id: string): Promise<FlowCustomer | null> {
  const companyId = await getCurrentCompanyId();
  if (!companyId) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("customers")
    .select("id, name, street, street_no, postcode, city, phone, email, notes")
    .eq("id", id)
    .eq("company_id", companyId)
    .maybeSingle();
  if (!data) return null;

  return {
    id: data.id as string,
    name: (data.name as string) ?? "",
    street: (data.street as string | null) ?? null,
    streetNo: (data.street_no as string | null) ?? null,
    postcode: (data.postcode as string | null) ?? null,
    city: (data.city as string | null) ?? null,
    phone: (data.phone as string | null) ?? null,
    email: (data.email as string | null) ?? null,
    notes: (data.notes as string | null) ?? null,
  };
}

/**
 * Kundendaten als eingefrorene Snapshot-Kopie fürs Dokument (Feldnamen wie DB).
 * null, wenn der Kunde nicht existiert oder nicht zur eigenen Firma gehört.
 */
export async function getCustomerSnapshot(
  customerId: string,
): Promise<CustomerSnapshot | null> {
  const companyId = await getCurrentCompanyId();
  if (!companyId) return null;

  const supabase = await createClient();
  const { data: customer } = await supabase
    .from("customers")
    .select("name, street, street_no, postcode, city, email, phone")
    .eq("id", customerId)
    .eq("company_id", companyId)
    .maybeSingle();
  if (!customer) return null;

  return {
    name: customer.name as string,
    street: (customer.street as string | null) ?? null,
    street_no: (customer.street_no as string | null) ?? null,
    postcode: (customer.postcode as string | null) ?? null,
    city: (customer.city as string | null) ?? null,
    email: (customer.email as string | null) ?? null,
    phone: (customer.phone as string | null) ?? null,
  };
}

/** Anzahl der Kunden der eigenen Firma (RLS-scoped, für Sidebar/Dashboard). */
export async function countCustomers(): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("customers")
    .select("id", { count: "exact", head: true });
  return count ?? 0;
}

export async function insertCustomer(input: CustomerInput): Promise<CustomerMutationResult> {
  const companyId = await getCurrentCompanyId();
  if (!companyId) return { error: "notAuthenticated" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .insert({
      company_id: companyId,
      name: input.name.trim(),
      street: input.street?.trim() || null,
      street_no: input.streetNo?.trim() || null,
      postcode: input.postcode?.trim() || null,
      city: input.city?.trim() || null,
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
      notes: input.notes?.trim() || null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  return { id: data.id };
}

export async function updateCustomer(
  id: string,
  input: CustomerInput,
): Promise<CustomerMutationResult> {
  const companyId = await getCurrentCompanyId();
  if (!companyId) return { error: "notAuthenticated" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("customers")
    .update({
      name: input.name.trim(),
      street: input.street?.trim() || null,
      street_no: input.streetNo?.trim() || null,
      postcode: input.postcode?.trim() || null,
      city: input.city?.trim() || null,
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
      notes: input.notes?.trim() || null,
    })
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) return { error: error.message };
  return {};
}

export async function deleteCustomer(id: string): Promise<CustomerMutationResult> {
  const companyId = await getCurrentCompanyId();
  if (!companyId) return { error: "notAuthenticated" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("customers")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) return { error: error.message };
  return {};
}
