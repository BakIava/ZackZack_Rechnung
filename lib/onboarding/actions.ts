"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { SetupFormData, SetupFormErrors } from "@/components/setup/types";

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
  if (!data.steuernummer.trim()) errors.steuernummer = "Steuernummer ist erforderlich";
  if (!data.iban.trim()) errors.iban = "IBAN ist erforderlich";

  if (Object.keys(errors).length > 0) {
    return { error: "Bitte alle Pflichtfelder ausfüllen.", errors };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Nicht angemeldet. Bitte neu einloggen." };

  const company_data = {
    name: data.name.trim(),
    legal_form: data.legal_form,
    street: data.street.trim(),
    street_no: data.street_no.trim(),
    postcode: data.postcode.trim(),
    city: data.city.trim(),
    phone: data.phone.trim(),
    mobile: data.mobile.trim(),
    fax: data.fax.trim(),
    email: data.email.trim(),
    steuernummer: data.steuernummer.trim(),
    ust_id: data.ust_id.trim(),
    registergericht: data.registergericht.trim(),
    handelsregister_nr: data.handelsregister_nr.trim(),
    kleinunternehmer: data.kleinunternehmer,
    bank_name: data.bank_name.trim(),
    iban: data.iban.trim(),
    bic: data.bic.trim(),
    account_holder: data.account_holder.trim(),
    logo_url: "",
  };

  const { error } = await supabase.rpc("complete_onboarding", { company_data });

  if (error) {
    // PK conflict on public.users → user already onboarded
    if (error.code === "23505" || error.message.includes("duplicate key")) {
      redirect(`/${locale}/dashboard`);
    }
    return { error: error.message };
  }

  redirect(`/${locale}/dashboard`);
}
