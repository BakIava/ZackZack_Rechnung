import { setRequestLocale } from "next-intl/server";
import { isRtlLocale, routing } from "@/i18n/routing";
import { DocumentsScreen } from "@/components/documents/documents-screen";
import { fetchDocumentsPageData } from "@/lib/repositories/documents";

type Props = { params: Promise<{ locale: string; document_id: string }> };

/** Wie documents/page.tsx, aber mit bereits geöffnetem Detail (Deep-Link, z. B. aus Suche/E-Mail). */
export default async function DocumentDetailPage({ params }: Props) {
  const { locale, document_id } = await params;
  setRequestLocale(locale);
  const dir = isRtlLocale(locale) ? "rtl" : "ltr";
  const { documents, paymentDays, companyName } = await fetchDocumentsPageData();

  return (
    <DocumentsScreen
      dir={dir}
      documents={documents}
      paymentDays={paymentDays}
      companyName={companyName}
      initialSelectedId={document_id}
    />
  );
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
