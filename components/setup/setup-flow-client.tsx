"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { SetupFlow } from "./setup-flow";
import { startNewDocument } from "@/lib/documents/draft-actions";
import { TRADE_IDS, type TradeId } from "@/types/database";
import type { OnboardingErrorCode } from "@/types/company";

interface Props {
  lang: "de" | "tr" | "ar";
  dir: "ltr" | "rtl";
}

export function SetupFlowClient({ lang, dir }: Props) {
  const router = useRouter();
  const locale = useLocale();
  const onboarding = useTranslations("Onboarding");
  const tradeLabels = Object.fromEntries(
    TRADE_IDS.map((tradeId) => [tradeId, onboarding(`trades.${tradeId}`)]),
  ) as Record<TradeId, string>;
  const errorMessages: Record<OnboardingErrorCode, string> = {
    required_fields: onboarding("errors.required_fields"),
    name_required: onboarding("errors.name_required"),
    director_required: onboarding("errors.director_required"),
    tax_number_required: onboarding("errors.tax_number_required"),
    iban_required: onboarding("errors.iban_required"),
    trades_required: onboarding("errors.trades_required"),
    trades_invalid: onboarding("errors.trades_invalid"),
    not_authenticated: onboarding("errors.not_authenticated"),
    setup_failed: onboarding("errors.setup_failed"),
  };

  return (
    <SetupFlow
      lang={lang}
      dir={dir}
      locale={locale}
      tradeLabels={tradeLabels}
      errorMessages={errorMessages}
      // Nach dem Setup direkt einen Draft anlegen und in Schritt 1 starten.
      onComplete={() => startNewDocument()}
      onDashboard={() => router.push(`/${locale}/dashboard`)}
    />
  );
}
