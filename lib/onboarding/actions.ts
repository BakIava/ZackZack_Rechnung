"use server";

import { completeOnboardingRpc } from "@/lib/repositories/onboarding";
import { getCurrentCompanyId, getCurrentUser } from "@/lib/supabase/auth";
import { validateTradeIds } from "@/lib/onboarding/trades";
import { deleteAllOnboardingUploadsForUser } from "@/lib/repositories/onboarding-uploads";
import { saveCompanyLogo } from "@/lib/repositories/companies";
import { prepareCompanyLogo } from "@/lib/company-logo/process";
import { validateSetupForm } from "@/lib/onboarding/validation";
import type {
  OnboardingErrorCode,
  SetupFormData,
  SetupValidationErrors,
} from "@/types/company";

export type OnboardingResult =
  | { ok: true; logoUploaded: boolean }
  | {
      ok: false;
      error: OnboardingErrorCode;
      errors?: SetupValidationErrors;
      setupCompleted?: boolean;
    };

export async function completeOnboarding(
  locale: string,
  data: SetupFormData,
  logoFormData?: FormData,
): Promise<OnboardingResult> {
  void locale;
  const errors: SetupValidationErrors = validateSetupForm(data);

  const tradeValidation = validateTradeIds(data.trade_ids);
  if (!tradeValidation.ok) {
    errors.trade_ids = tradeValidation.reason === "required"
      ? "trades_required"
      : "trades_invalid";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, error: "required_fields", errors };
  }

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "not_authenticated" };

  let preparedLogo: Awaited<ReturnType<typeof prepareCompanyLogo>> | null = null;
  const logoEntry = logoFormData?.get("logo");
  if (logoEntry !== undefined && logoEntry !== null) {
    if (!(logoEntry instanceof File)) {
      return { ok: false, error: "logoFileMissing" };
    }
    preparedLogo = await prepareCompanyLogo(logoEntry);
    if (!preparedLogo.ok) return { ok: false, error: preparedLogo.error };
  }
  try {
    await deleteAllOnboardingUploadsForUser(user.id);
  } catch {
    // Best effort: ein Storage-Problem darf den manuellen Setup-Weg nicht sperren.
  }

  if (!tradeValidation.ok) {
    return {
      ok: false,
      error: tradeValidation.reason === "required"
        ? "trades_required"
        : "trades_invalid",
      errors: {
        trade_ids: tradeValidation.reason === "required"
          ? "trades_required"
          : "trades_invalid",
      },
    };
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

  let companyId: string | null = result.ok ? result.companyId : null;
  if (!result.ok) {
    if (result.reason === "already_completed") {
      companyId = await getCurrentCompanyId();
    }
    if (result.reason === "not_authenticated") {
      return { ok: false, error: "not_authenticated" };
    }
    if (result.reason === "trades_required" || result.reason === "trades_invalid") {
      return {
        ok: false,
        error: result.reason,
        errors: { trade_ids: result.reason },
      };
    }
    if (result.reason !== "already_completed") {
      return { ok: false, error: "setup_failed" };
    }
  }

  if (!companyId) return { ok: false, error: "setup_failed" };
  if (preparedLogo?.ok) {
    const uploaded = await saveCompanyLogo(companyId, preparedLogo.logo);
    if ("error" in uploaded) {
      return {
        ok: false,
        error: "logoUploadFailed",
        setupCompleted: true,
      };
    }
  }

  return { ok: true, logoUploaded: Boolean(preparedLogo?.ok) };
}
