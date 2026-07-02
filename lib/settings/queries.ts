import { createClient } from "@/lib/supabase/server";
import type { CompanySettings, SettingsData } from "./types";

export type GetSettingsResult =
  | { ok: true; data: SettingsData }
  | { ok: false; reason: "unauthenticated" | "no_profile" | "db_error"; detail?: string };

const COMPANY_COLUMNS =
  "id, name, legal_form, street, street_no, postcode, city, phone, mobile, fax, " +
  "email, director, steuernummer, ust_id, registergericht, handelsregister_nr, " +
  "kleinunternehmer, bank_name, iban, bic, account_holder, logo_url, payment_days";

const COMPANY_COLUMNS_FALLBACK =
  "id, name, legal_form, street, street_no, postcode, city, phone, " +
  "email, director, steuernummer, ust_id, kleinunternehmer, bank_name, iban, bic, account_holder, logo_url";

const COMPANY_DEFAULTS: Partial<CompanySettings> = {
  mobile: null,
  fax: null,
  registergericht: null,
  handelsregister_nr: null,
  payment_days: 14
};

export async function getSettingsData(): Promise<GetSettingsResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "unauthenticated" };

  const { data: profile } = await supabase
    .from("users")
    .select("company_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) return { ok: false, reason: "no_profile" };

  let company: Record<string, unknown> | null = null;

  const { data: full, error: fullError } = await supabase
    .from("companies")
    .select(COMPANY_COLUMNS)
    .eq("id", profile.company_id)
    .single();

  if (full && !fullError) {
    company = full as unknown as Record<string, unknown>;
  } else {
    // Fallback: some columns (payment_days, mobile, fax…) may not
    // exist yet in the DB. Retry with the minimal set that's guaranteed to be there.
    const { data: minimal, error: minError } = await supabase
      .from("companies")
      .select(COMPANY_COLUMNS_FALLBACK)
      .eq("id", profile.company_id)
      .single();

    if (!minimal || minError) {
      return { ok: false, reason: "db_error", detail: (minError ?? fullError)?.message };
    }
    company = { ...COMPANY_DEFAULTS, ...(minimal as unknown as Record<string, unknown>) };
  }

  const year = new Date().getFullYear();
  const { data: sequence } = await supabase
    .from("number_sequences")
    .select("last_number")
    .eq("company_id", profile.company_id)
    .eq("document_type", "invoice")
    .eq("year", year)
    .maybeSingle();

  const currentInvoiceNumber = sequence
    ? `${year}-${String((sequence as { last_number: number }).last_number).padStart(4, "0")}`
    : null;

  return {
    ok: true,
    data: {
      company: company as unknown as CompanySettings,
      authEmail: user.email ?? null,
      currentInvoiceNumber,
    },
  };
}
