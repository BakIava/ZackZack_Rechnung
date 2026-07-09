/**
 * Repository `companies` — einzige Stelle mit Supabase-Zugriff auf die Tabelle
 * `companies`, die zugehörige `number_sequences`-Anzeige und den
 * Logo-Storage-Bucket `company-logos`.
 */

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, getCurrentCompanyId } from "@/lib/supabase/auth";
import type { CompanySettings, SettingsData } from "@/types/company";

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

/** Vollständige Stammdaten + Auth-E-Mail + aktuelle Rechnungsnummer (Einstellungen). */
export async function getSettingsData(): Promise<GetSettingsResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, reason: "unauthenticated" };

  const companyId = await getCurrentCompanyId();
  if (!companyId) return { ok: false, reason: "no_profile" };

  const supabase = await createClient();
  let company: Record<string, unknown> | null = null;

  const { data: full, error: fullError } = await supabase
    .from("companies")
    .select(COMPANY_COLUMNS)
    .eq("id", companyId)
    .single();

  if (full && !fullError) {
    company = full as unknown as Record<string, unknown>;
  } else {
    // Fallback: some columns (payment_days, mobile, fax…) may not
    // exist yet in the DB. Retry with the minimal set that's guaranteed to be there.
    const { data: minimal, error: minError } = await supabase
      .from("companies")
      .select(COMPANY_COLUMNS_FALLBACK)
      .eq("id", companyId)
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
    .eq("company_id", companyId)
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

/** Name + Inhaber der eigenen Firma (RLS-scoped, Sidebar/Dashboard). */
export async function getCompanyNameAndDirector(): Promise<{
  name: string;
  director: string;
}> {
  const supabase = await createClient();
  const { data } = await supabase.from("companies").select("name, director").single();
  return { name: data?.name ?? "", director: data?.director ?? "" };
}

/** Name + Zahlungsziel für die Dokumentenliste. */
export async function getCompanyNameAndPaymentDays(
  companyId: string,
): Promise<{ name: string; paymentDays: number }> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("companies")
    .select("name, payment_days")
    .eq("id", companyId)
    .maybeSingle();
  return {
    name: (data?.name as string | null) ?? "",
    paymentDays: data?.payment_days ?? 14,
  };
}

/** §19-Default der Firma (Snapshot beim Anlegen eines Entwurfs). */
export async function getCompanyKleinunternehmer(companyId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data: company } = await supabase
    .from("companies")
    .select("kleinunternehmer")
    .eq("id", companyId)
    .maybeSingle();
  return company?.kleinunternehmer ?? true;
}

/** Teil-Update der Stammdaten (Patch mit DB-Spaltennamen). */
export async function updateCompany(
  companyId: string,
  patch: Record<string, unknown>,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("companies").update(patch).eq("id", companyId);
  if (error) return { error: error.message };
  return {};
}

/**
 * Lädt das Firmenlogo in den öffentlichen Bucket `company-logos` hoch
 * (upsert auf festen Pfad pro Firma) und liefert die öffentliche URL.
 */
export async function uploadCompanyLogo(
  companyId: string,
  file: File,
  ext: string,
): Promise<{ publicUrl: string } | { error: string }> {
  const supabase = await createClient();
  const path = `${companyId}/logo.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("company-logos")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (uploadError) return { error: uploadError.message };

  const { data: publicUrl } = supabase.storage.from("company-logos").getPublicUrl(path);
  return { publicUrl: publicUrl.publicUrl };
}

/** Firma anlegen (Service-Role, nur Onboarding – users-Zeile existiert noch nicht). */
export async function insertCompanyAdmin(
  company: Record<string, unknown>,
): Promise<{ id: string } | { error: string }> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("companies")
    .insert(company)
    .select("id")
    .single();
  if (error) return { error: error.message };
  return { id: data.id };
}

/** Firma wieder löschen (Service-Role, Rollback im Onboarding). */
export async function deleteCompanyAdmin(companyId: string): Promise<void> {
  const admin = createAdminClient();
  await admin.from("companies").delete().eq("id", companyId);
}
