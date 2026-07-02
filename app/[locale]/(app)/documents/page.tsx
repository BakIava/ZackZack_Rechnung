import { setRequestLocale } from "next-intl/server";
import { isRtlLocale, routing } from "@/i18n/routing";
import { DocumentsScreen } from "@/components/documents/documents-screen";

type Props = { params: Promise<{ locale: string }> };

export default async function DocumentsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const dir = isRtlLocale(locale) ? "rtl" : "ltr";

  return <DocumentsScreen dir={dir} />;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
