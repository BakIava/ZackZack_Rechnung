import { setRequestLocale } from "next-intl/server";
import { isRtlLocale } from "@/i18n/routing";
import { DocumentsScreen } from "@/components/documents/documents-screen";
import { fetchDocumentsPageData } from "@/lib/repositories/documents";

type Props = { params: Promise<{ locale: string; document_id: string }> };

// Pro Request rendern: lädt Nutzerdaten (Cookies/RLS) für beliebige Dokument-IDs.
// Ohne dieses Flag registriert der Build die Route als On-Demand-SSG (die
// document_id ist beim Build unbekannt) und cookies() schlägt zur Laufzeit mit
// DYNAMIC_SERVER_USAGE fehl.
export const dynamic = "force-dynamic";

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
