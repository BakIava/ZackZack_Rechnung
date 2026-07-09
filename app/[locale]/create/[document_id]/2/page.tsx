import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Step2Screen } from "@/components/create/step2-screen";
import { getDraftItems } from "@/lib/repositories/document-items";
import { getDraftContext, getFlowDocMeta } from "@/lib/repositories/documents";
import { getServices } from "@/lib/repositories/services";
import { isRtlLocale, type Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

interface Step2PageProps {
  params: Promise<{ locale: string; document_id: string }>;
}

export default async function Step2Page({ params }: Step2PageProps) {
  const { locale, document_id } = await params;
  setRequestLocale(locale);
  const dir = isRtlLocale(locale) ? "rtl" : "ltr";

  // Finalisierte Dokumente sind unveränderbar → in den Ansichtsmodus (Schritt 3).
  const meta = await getFlowDocMeta(document_id);
  if (meta && meta.status !== "draft") {
    redirect(`/${locale}/create/${document_id}/3`);
  }

  const [context, items, services] = await Promise.all([
    getDraftContext(document_id),
    getDraftItems(document_id),
    getServices(),
  ]);

  // Layout validiert bereits; dieser Fallback greift nur bei Race-Conditions.
  if (!context) redirect(`/${locale}/documents`);

  return (
    <Step2Screen
      dir={dir}
      locale={locale as Locale}
      documentId={document_id}
      context={context}
      initialItems={items}
      services={services}
    />
  );
}
