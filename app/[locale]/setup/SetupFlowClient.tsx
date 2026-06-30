"use client";

import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { SetupFlow } from "../../../components/setup/SetupFlow";

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
      onComplete={() => router.push(`/${locale}/create/1`)}
      onDashboard={() => router.push(`/${locale}/dashboard`)}
    />
  );
}
