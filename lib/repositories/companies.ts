/**
 * Repository `companies` — einzige Stelle mit Supabase-Zugriff auf die Tabelle
 * `companies`, die zugehörige `number_sequences`-Anzeige und den
 * Logo-Storage-Bucket `company-logos`.
 */

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, getCurrentCompanyId } from "@/lib/supabase/auth";
import type { CompanySettings, SettingsData } from "@/types/company";
import type { TaxRate } from "@/types/database";
import type { PreparedCompanyLogo } from "@/lib/company-logo/constants";
import { resolveDocumentDefaultTaxRate } from "@/lib/documents/tax";

export type GetSettingsResult =
  | { ok: true; data: SettingsData }
  | { ok: false; reason: "unauthenticated" | "no_profile" | "db_error"; detail?: string };

const COMPANY_COLUMNS =
  "id, name, legal_form, street, street_no, postcode, city, phone, mobile, fax, " +
  "email, director, steuernummer, ust_id, registergericht, handelsregister_nr, " +
  "kleinunternehmer, default_tax_rate, bank_name, iban, bic, account_holder, logo_url, payment_days";

const COMPANY_COLUMNS_FALLBACK =
  "id, name, legal_form, street, street_no, postcode, city, phone, " +
  "email, director, steuernummer, ust_id, kleinunternehmer, bank_name, iban, bic, account_holder, logo_url";

const COMPANY_DEFAULTS: Partial<CompanySettings> = {
  mobile: null,
  fax: null,
  registergericht: null,
  handelsregister_nr: null,
  payment_days: 14,
  default_tax_rate: 19,
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

/** Steuerstatus und Standardsatz für den Snapshot eines neuen Dokuments. */
export async function getCompanyTaxSettings(
  companyId: string,
): Promise<{ isKleinunternehmer: boolean; defaultTaxRate: TaxRate }> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("companies")
    .select("kleinunternehmer, default_tax_rate")
    .eq("id", companyId)
    .maybeSingle();
  const isKleinunternehmer = data?.kleinunternehmer ?? true;
  const companyDefaultRate = (data?.default_tax_rate as TaxRate | null) ?? 19;
  return {
    isKleinunternehmer,
    defaultTaxRate: resolveDocumentDefaultTaxRate(
      companyDefaultRate,
      isKleinunternehmer,
    ),
  };
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

export const COMPANY_LOGO_BUCKET = "company-logos";

export function companyLogoObjectPath(
  companyId: string,
  objectId: string,
  extension: "png" | "jpg",
): string {
  return `${companyId}/${objectId}.${extension}`;
}

export function companyLogoPathFromUrl(companyId: string, logoUrl: string): string | null {
  try {
    const marker = `/storage/v1/object/public/${COMPANY_LOGO_BUCKET}/`;
    const pathname = decodeURIComponent(new URL(logoUrl).pathname);
    const markerIndex = pathname.indexOf(marker);
    if (markerIndex < 0) return null;
    const path = pathname.slice(markerIndex + marker.length);
    return path.startsWith(`${companyId}/`) ? path : null;
  } catch {
    return null;
  }
}

async function getCompanyLogoUrl(companyId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("companies")
    .select("logo_url")
    .eq("id", companyId)
    .maybeSingle();
  return (data?.logo_url as string | null) ?? null;
}

async function isLogoReferencedByFinalizedDocument(
  companyId: string,
  logoUrl: string,
): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .select("id")
    .eq("company_id", companyId)
    .eq("logo_snapshot_captured", true)
    .eq("logo_url_snapshot", logoUrl)
    .limit(1)
    .maybeSingle();
  // Fail closed: bei einem Lookup-Fehler niemals ein eventuell archiv-relevantes
  // Logo löschen.
  return error ? true : Boolean(data);
}

async function removeUnreferencedLogo(
  companyId: string,
  logoUrl: string | null,
): Promise<{ cleanupFailed?: boolean }> {
  if (!logoUrl || (await isLogoReferencedByFinalizedDocument(companyId, logoUrl))) {
    return {};
  }
  const path = companyLogoPathFromUrl(companyId, logoUrl);
  if (!path) return {};
  const supabase = await createClient();
  const { error } = await supabase.storage.from(COMPANY_LOGO_BUCKET).remove([path]);
  return error ? { cleanupFailed: true } : {};
}

/** Speichert ein geprüftes Logo unter einem unveränderlichen, firmenbezogenen Pfad. */
export async function saveCompanyLogo(
  companyId: string,
  logo: PreparedCompanyLogo,
): Promise<{ publicUrl: string; cleanupFailed?: boolean } | { error: string }> {
  const previousUrl = await getCompanyLogoUrl(companyId);
  const supabase = await createClient();
  const path = companyLogoObjectPath(companyId, crypto.randomUUID(), logo.extension);
  const bodyBytes = new Uint8Array(logo.bytes.byteLength);
  bodyBytes.set(logo.bytes);
  const body = new Blob([bodyBytes], { type: logo.contentType });

  const { error: uploadError } = await supabase.storage
    .from(COMPANY_LOGO_BUCKET)
    .upload(path, body, { upsert: false, contentType: logo.contentType });
  if (uploadError) return { error: uploadError.message };

  const { data: publicUrlData } = supabase.storage
    .from(COMPANY_LOGO_BUCKET)
    .getPublicUrl(path);
  const publicUrl = publicUrlData.publicUrl;
  const saveResult = await updateCompany(companyId, { logo_url: publicUrl });
  if (saveResult.error) {
    await supabase.storage.from(COMPANY_LOGO_BUCKET).remove([path]);
    return { error: saveResult.error };
  }

  const cleanup = await removeUnreferencedLogo(companyId, previousUrl);
  return { publicUrl, ...cleanup };
}

/** Entfernt die DB-Verknüpfung und löscht das Objekt, sofern kein Beleg es referenziert. */
export async function removeCompanyLogo(
  companyId: string,
): Promise<{ cleanupFailed?: boolean } | { error: string }> {
  const previousUrl = await getCompanyLogoUrl(companyId);
  const saveResult = await updateCompany(companyId, { logo_url: null });
  if (saveResult.error) return { error: saveResult.error };
  return removeUnreferencedLogo(companyId, previousUrl);
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
