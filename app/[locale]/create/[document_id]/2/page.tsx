import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Step2Screen } from "@/components/flow/step2-screen";
import { getDraftContext, getDraftItems } from "@/lib/documents/item-queries";
import { getServices } from "@/lib/services/queries";
import { isRtlLocale, type Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

interface Step2PageProps {
  params: Promise<{ locale: string; document_id: string }>;
}

export default async function Step2Page({ params }: Step2PageProps) {
  const { locale, document_id } = await params;
  setRequestLocale(locale);
  const dir = isRtlLocale(locale) ? "rtl" : "ltr";

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
