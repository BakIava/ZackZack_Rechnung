"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deleteCompanyAdmin, insertCompanyAdmin } from "@/lib/repositories/companies";
import { hasUserProfileAdmin, insertUserProfileAdmin } from "@/lib/repositories/users";
import type { SetupFormData, SetupFormErrors } from "@/types/company";

export interface OnboardingResult {
  error: string;
  errors?: SetupFormErrors;
}

export async function completeOnboarding(
  locale: string,
  data: SetupFormData,
): Promise<OnboardingResult | undefined> {
  const errors: SetupFormErrors = {};

  if (!data.name.trim()) errors.name = "Firmenname ist erforderlich";
  if (!data.director.trim()) errors.director = "Geschäftsführer ist erforderlich";
  if (!data.steuernummer.trim()) errors.steuernummer = "Steuernummer ist erforderlich";
  if (!data.iban.trim()) errors.iban = "IBAN ist erforderlich";

  if (Object.keys(errors).length > 0) {
    return { error: "Bitte alle Pflichtfelder ausfüllen.", errors };
  }

  // Verify the caller is authenticated
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet. Bitte neu einloggen." };

  // Check if already onboarded → just redirect
  if (await hasUserProfileAdmin(user.id)) redirect(`/${locale}/dashboard`);

  // INSERT company
  const company = await insertCompanyAdmin({
    name: data.name.trim(),
    legal_form: data.legal_form,
    director: data.director.trim() || null,
    street: data.street.trim(),
    street_no: data.street_no.trim(),
    postcode: data.postcode.trim(),
    city: data.city.trim(),
    phone: data.phone.trim() || null,
    mobile: data.mobile.trim() || null,
    fax: data.fax.trim() || null,
    email: data.email.trim() || null,
    steuernummer: data.steuernummer.trim(),
    ust_id: data.ust_id.trim() || null,
    registergericht: data.registergericht.trim() || null,
    handelsregister_nr: data.handelsregister_nr.trim() || null,
    kleinunternehmer: data.kleinunternehmer,
    bank_name: data.bank_name.trim() || null,
    iban: data.iban.trim(),
    bic: data.bic.trim() || null,
    account_holder: data.account_holder.trim() || null,
  });

  if ("error" in company) return { error: company.error };

  // INSERT public.users — if this fails, roll back the company row
  const { error: userErr } = await insertUserProfileAdmin({
    id: user.id,
    company_id: company.id,
    email: user.email,
  });

  if (userErr) {
    await deleteCompanyAdmin(company.id);
    if (userErr.code === "23505") redirect(`/${locale}/dashboard`);
    return { error: userErr.message };
  }

  redirect(`/${locale}/dashboard`);
}
