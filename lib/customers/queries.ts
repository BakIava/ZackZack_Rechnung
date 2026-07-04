import { createClient } from "@/lib/supabase/server";
import { deriveInitials } from "@/lib/initials";
import type { CustomerListItem, CustomerRow } from "./types";

async function getCompanyId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("users")
    .select("company_id")
    .eq("id", user.id)
    .maybeSingle();
  return data?.company_id ?? null;
}

export async function getCustomers(): Promise<CustomerRow[]> {
  const companyId = await getCompanyId();
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
  const companyId = await getCompanyId();
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
