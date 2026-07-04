import { setRequestLocale } from "next-intl/server";
import { Step3Screen } from "@/components/create/step3-screen";
import { isRtlLocale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

interface Step3PageProps {
  params: Promise<{ locale: string; document_id: string }>;
}

export default async function Step3Page({ params }: Step3PageProps) {
  const { locale, document_id } = await params;
  setRequestLocale(locale);
  const dir = isRtlLocale(locale) ? "rtl" : "ltr";

  return <Step3Screen dir={dir} documentId={document_id} />;
}
