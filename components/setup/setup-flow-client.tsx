"use client";

import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { SetupFlow } from "./setup-flow";
import { startNewDocument } from "@/lib/documents/draft-actions";

interface Props {
  lang: "de" | "tr" | "ar";
  dir: "ltr" | "rtl";
}

export function SetupFlowClient({ lang, dir }: Props) {
  const router = useRouter();
  const locale = useLocale();

  return (
    <SetupFlow
      lang={lang}
      dir={dir}
      locale={locale}
      // Nach dem Setup direkt einen Draft anlegen und in Schritt 1 starten.
      onComplete={() => startNewDocument()}
      onDashboard={() => router.push(`/${locale}/dashboard`)}
    />
  );
}
