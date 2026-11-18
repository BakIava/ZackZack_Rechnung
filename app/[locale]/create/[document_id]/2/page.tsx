import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Step2Screen } from "@/components/create/2/step2-screen";
import { getStep2DocumentData } from "@/lib/repositories/document-previews";
import { getServices } from "@/lib/repositories/services";
import { getCurrentCompanyId } from "@/lib/supabase/auth";
import { isRtlLocale, type Locale } from "@/i18n/routing";
import { loadPdfLogo } from "@/lib/pdf/document-logo";

export const dynamic = "force-dynamic";
// Das Lesen eines Nachweises (Server-Action auf dieser Seite) dauert ~10–20 s.
export const maxDuration = 60;

interface Step2PageProps {
  params: Promise<{ locale: string; document_id: string }>;
}

export default async function Step2Page({ params }: Step2PageProps) {
  const { locale, document_id } = await params;
  setRequestLocale(locale);
  const dir = isRtlLocale(locale) ? "rtl" : "ltr";

  const [documentData, services, companyId] = await Promise.all([
    getStep2DocumentData(document_id),
    getServices(),
    getCurrentCompanyId(),
  ]);

  // Layout validiert bereits; dieser Fallback greift nur bei Race-Conditions.
  if (!documentData) redirect(`/${locale}/documents`);
  if (documentData.preview.status !== "draft") {
    redirect(`/${locale}/create/${document_id}/3`);
  }
  const logo = await loadPdfLogo(documentData.preview.company.logoUrl);

  return (
    <Step2Screen
      dir={dir}
      locale={locale as Locale}
      documentId={document_id}
      initialPreview={documentData.preview}
      initialItems={documentData.draftItems}
      logo={logo}
      services={services}
      cacheScope={companyId ?? "ohne-firma"}
    />
  );
}
