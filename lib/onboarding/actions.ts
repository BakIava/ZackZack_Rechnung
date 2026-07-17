"use server";

import { redirect } from "next/navigation";
import { completeOnboardingRpc } from "@/lib/repositories/onboarding";
import { getCurrentUser } from "@/lib/supabase/auth";
import { validateTradeIds } from "@/lib/onboarding/trades";
import type {
  OnboardingErrorCode,
  SetupFormData,
  SetupValidationErrors,
} from "@/types/company";

export interface OnboardingResult {
  error: OnboardingErrorCode;
  errors?: SetupValidationErrors;
}

export async function completeOnboarding(
  locale: string,
  data: SetupFormData,
): Promise<OnboardingResult | undefined> {
  const errors: SetupValidationErrors = {};

  if (!data.name.trim()) errors.name = "name_required";
  if (!data.director.trim()) errors.director = "director_required";
  if (!data.steuernummer.trim()) errors.steuernummer = "tax_number_required";
  if (!data.iban.trim()) errors.iban = "iban_required";

  const tradeValidation = validateTradeIds(data.trade_ids);
  if (!tradeValidation.ok) {
    errors.trade_ids = tradeValidation.reason === "required"
      ? "trades_required"
      : "trades_invalid";
  }

  if (Object.keys(errors).length > 0) {
    return { error: "required_fields", errors };
  }

  const user = await getCurrentUser();
  if (!user) return { error: "not_authenticated" };

  if (!tradeValidation.ok) {
    return { error: "trades_invalid", errors: { trade_ids: "trades_invalid" } };
  }

  const result = await completeOnboardingRpc({
    ...data,
    name: data.name.trim(),
    legal_form: data.legal_form.trim(),
    director: data.director.trim(),
    street: data.street.trim(),
    street_no: data.street_no.trim(),
    postcode: data.postcode.trim(),
    city: data.city.trim(),
    handelsregister_nr: data.handelsregister_nr.trim(),
    registergericht: data.registergericht.trim(),
    email: data.email.trim(),
    phone: data.phone.trim(),
    mobile: data.mobile.trim(),
    fax: data.fax.trim(),
    steuernummer: data.steuernummer.trim(),
    ust_id: data.ust_id.trim(),
    iban: data.iban.trim(),
    bic: data.bic.trim(),
    bank_name: data.bank_name.trim(),
    account_holder: data.account_holder.trim(),
    trade_ids: tradeValidation.tradeIds,
  });

  if (!result.ok) {
    if (result.reason === "already_completed") {
      redirect(`/${locale}/dashboard`);
    }
    if (result.reason === "not_authenticated") {
      return { error: "not_authenticated" };
    }
    if (result.reason === "trades_required" || result.reason === "trades_invalid") {
      return {
        error: result.reason,
        errors: { trade_ids: result.reason },
      };
    }
    return { error: "setup_failed" };
  }

  redirect(`/${locale}/dashboard`);
}
