import { setRequestLocale } from "next-intl/server";
import { isRtlLocale } from "@/i18n/routing";
import { SetupFlowClient } from "@/components/setup/setup-flow-client";

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function SetupPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const dir = isRtlLocale(locale) ? "rtl" : "ltr";
  const lang = (["de", "tr", "ar"].includes(locale) ? locale : "de") as "de" | "tr" | "ar";

  return (
    <div className="h-dvh overflow-hidden">
      <SetupFlowClient lang={lang} dir={dir} />
    </div>
  );
}
