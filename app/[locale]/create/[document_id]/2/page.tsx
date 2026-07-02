import { setRequestLocale } from "next-intl/server";
import { Step2Screen } from "@/components/flow/step2-screen";
import { isRtlLocale, type Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

interface Step2PageProps {
  params: Promise<{ locale: string; document_id: string }>;
}

export default async function Step2Page({ params }: Step2PageProps) {
  const { locale, document_id } = await params;
  setRequestLocale(locale);
  const dir = isRtlLocale(locale) ? "rtl" : "ltr";

  return <Step2Screen dir={dir} locale={locale as Locale} documentId={document_id} />;
}
