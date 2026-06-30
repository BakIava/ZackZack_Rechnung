import { createClient } from "@/lib/supabase/server";
import type { CompanySettings, SettingsData } from "./types";

const COMPANY_COLUMNS =
  "id, name, legal_form, street, street_no, postcode, city, phone, mobile, fax, " +
  "email, director, steuernummer, ust_id, registergericht, handelsregister_nr, " +
  "kleinunternehmer, bank_name, iban, bic, account_holder, logo_url, payment_days, invoice_footer";

export async function getSettingsData(): Promise<SettingsData | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("company_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) return null;

  const { data: company, error } = await supabase
    .from("companies")
    .select(COMPANY_COLUMNS)
    .eq("id", profile.company_id)
    .single();
  if (error || !company) return null;

  const year = new Date().getFullYear();
  const { data: sequence } = await supabase
    .from("number_sequences")
    .select("last_number")
    .eq("company_id", profile.company_id)
    .eq("document_type", "invoice")
    .eq("year", year)
    .maybeSingle();

  const currentInvoiceNumber = sequence
    ? `${year}-${String(sequence.last_number).padStart(4, "0")}`
    : null;

  return {
    company: company as unknown as CompanySettings,
    authEmail: user.email ?? null,
    currentInvoiceNumber,
  };
}
