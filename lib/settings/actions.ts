"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/supabase/auth";
import {
  removeCompanyLogo,
  saveCompanyLogo,
  updateCompany,
} from "@/lib/repositories/companies";
import { isTaxRate, resolveDocumentDefaultTaxRate } from "@/lib/documents/tax";
import { prepareCompanyLogo } from "@/lib/company-logo/process";
import type { TaxRate } from "@/types/database";

export interface SettingsActionResult {
  error?: string;
  warning?: string;
}

async function getCompanyId(): Promise<{ companyId: string } | { error: string }> {
  const companyId = await getCurrentCompanyId();
  if (!companyId) return { error: "notAuthenticated" };
  return { companyId };
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

/** Steuerstatus + Standardsatz atomar als Firmenvorgabe speichern. */
export async function saveTaxSettings(data: {
  kleinunternehmer: boolean;
  defaultTaxRate: TaxRate;
}): Promise<SettingsActionResult> {
  if (!isTaxRate(data.defaultTaxRate)) return { error: "taxRateInvalid" };

  const ctx = await getCompanyId();
  if ("error" in ctx) return ctx;

  return updateCompany(ctx.companyId, {
    kleinunternehmer: data.kleinunternehmer,
    default_tax_rate: resolveDocumentDefaultTaxRate(
      data.defaultTaxRate,
      data.kleinunternehmer,
    ),
  });
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
  const prepared = await prepareCompanyLogo(file);
  if (!prepared.ok) return { error: prepared.error };

  const ctx = await getCompanyId();
  if ("error" in ctx) return ctx;

  const uploaded = await saveCompanyLogo(ctx.companyId, prepared.logo);
  if ("error" in uploaded) return { error: "logoUploadFailed" };
  return {
    logoUrl: uploaded.publicUrl,
    ...(uploaded.cleanupFailed ? { warning: "logoCleanupFailed" } : {}),
  };
}

export async function removeLogo(): Promise<SettingsActionResult & { removed?: boolean }> {
  const ctx = await getCompanyId();
  if ("error" in ctx) return ctx;
  const removed = await removeCompanyLogo(ctx.companyId);
  if ("error" in removed) return { error: "logoRemoveFailed" };
  return {
    removed: true,
    ...(removed.cleanupFailed ? { warning: "logoCleanupFailed" } : {}),
  };
}

export async function signOutAndRedirect(locale: string): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(`/${locale}/login`);
}
