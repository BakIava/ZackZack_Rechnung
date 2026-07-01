"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface SettingsActionResult {
  error?: string;
}

const LOGO_MAX_BYTES = 2 * 1024 * 1024;
const LOGO_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/svg+xml": "svg",
};

async function getCompanyId(): Promise<{ companyId: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "notAuthenticated" };

  const { data: profile } = await supabase
    .from("users")
    .select("company_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) return { error: "notAuthenticated" };

  return { companyId: profile.company_id };
}

async function updateCompany(
  companyId: string,
  patch: Record<string, unknown>,
): Promise<SettingsActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("companies").update(patch).eq("id", companyId);
  if (error) return { error: error.message };
  return {};
}

export async function saveFirmaInhaber(data: {
  name: string;
  legal_form: string;
  director: string;
}): Promise<SettingsActionResult> {
  if (!data.name.trim()) return { error: "nameRequired" };

  const ctx = await getCompanyId();
  if ("error" in ctx) return ctx;

  return updateCompany(ctx.companyId, {
    name: data.name.trim(),
    legal_form: data.legal_form,
    director: data.director.trim() || null,
  });
}

export async function saveAdresse(data: {
  street: string;
  street_no: string;
  postcode: string;
  city: string;
}): Promise<SettingsActionResult> {
  const ctx = await getCompanyId();
  if ("error" in ctx) return ctx;

  return updateCompany(ctx.companyId, {
    street: data.street.trim(),
    street_no: data.street_no.trim(),
    postcode: data.postcode.trim(),
    city: data.city.trim(),
  });
}

export async function saveSteuer(data: {
  steuernummer: string;
  ust_id: string;
}): Promise<SettingsActionResult> {
  if (!data.steuernummer.trim()) return { error: "steuernummerRequired" };

  const ctx = await getCompanyId();
  if ("error" in ctx) return ctx;

  return updateCompany(ctx.companyId, {
    steuernummer: data.steuernummer.trim(),
    ust_id: data.ust_id.trim() || null,
  });
}

export async function saveKontakt(data: {
  phone: string;
  mobile: string;
  fax: string;
  email: string;
}): Promise<SettingsActionResult> {
  const ctx = await getCompanyId();
  if ("error" in ctx) return ctx;

  return updateCompany(ctx.companyId, {
    phone: data.phone.trim() || null,
    mobile: data.mobile.trim() || null,
    fax: data.fax.trim() || null,
    email: data.email.trim() || null,
  });
}

export async function saveBankverbindung(data: {
  bank_name: string;
  iban: string;
  bic: string;
  account_holder: string;
}): Promise<SettingsActionResult> {
  const ctx = await getCompanyId();
  if ("error" in ctx) return ctx;

  return updateCompany(ctx.companyId, {
    bank_name: data.bank_name.trim() || null,
    iban: data.iban.trim() || null,
    bic: data.bic.trim() || null,
    account_holder: data.account_holder.trim() || null,
  });
}

export async function saveKleinunternehmer(kleinunternehmer: boolean): Promise<SettingsActionResult> {
  const ctx = await getCompanyId();
  if ("error" in ctx) return ctx;

  return updateCompany(ctx.companyId, { kleinunternehmer });
}

export async function savePaymentDays(paymentDays: number): Promise<SettingsActionResult> {
  if (!Number.isInteger(paymentDays) || paymentDays <= 0) {
    return { error: "paymentDaysInvalid" };
  }

  const ctx = await getCompanyId();
  if ("error" in ctx) return ctx;

  return updateCompany(ctx.companyId, { payment_days: paymentDays });
}

export async function uploadLogo(formData: FormData): Promise<SettingsActionResult & { logoUrl?: string }> {
  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "logoFileMissing" };

  const ext = LOGO_TYPES[file.type];
  if (!ext) return { error: "logoTypeInvalid" };
  if (file.size > LOGO_MAX_BYTES) return { error: "logoTooLarge" };

  const ctx = await getCompanyId();
  if ("error" in ctx) return ctx;

  const supabase = await createClient();
  const path = `${ctx.companyId}/logo.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("company-logos")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (uploadError) return { error: uploadError.message };

  const { data: publicUrl } = supabase.storage.from("company-logos").getPublicUrl(path);
  const logoUrl = `${publicUrl.publicUrl}?t=${Date.now()}`;

  const saveResult = await updateCompany(ctx.companyId, { logo_url: logoUrl });
  if (saveResult.error) return saveResult;

  return { logoUrl };
}

export async function signOutAndRedirect(locale: string): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(`/${locale}/login`);
}
