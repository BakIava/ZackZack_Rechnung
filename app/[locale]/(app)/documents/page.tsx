import { setRequestLocale } from "next-intl/server";
import { isRtlLocale, routing } from "@/i18n/routing";
import { DocumentsScreen } from "@/components/documents/documents-screen";
import { fetchDocumentsPageData } from "@/lib/documents/queries";

type Props = { params: Promise<{ locale: string }> };

export default async function DocumentsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const dir = isRtlLocale(locale) ? "rtl" : "ltr";
  const { documents, paymentDays, companyName } = await fetchDocumentsPageData();

  return (
    <DocumentsScreen
      dir={dir}
      documents={documents}
      paymentDays={paymentDays}
      companyName={companyName}
    />
  );
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
