import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/supabase/auth";
import { deriveInitials } from "@/lib/initials";
import type { CustomerListItem, CustomerRow } from "./types";

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
