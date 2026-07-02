import { setRequestLocale } from "next-intl/server";
import { isRtlLocale } from "@/i18n/routing";
import { loadStep1Data } from "@/lib/flow/queries";
import { FlowKundeStep } from "@/components/flow/FlowKundeStep";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ locale: string; document_id: string }>;
}

export default async function Schritt1Page({ params }: Props) {
  const { locale, document_id } = await params;
  setRequestLocale(locale);

  const dir = isRtlLocale(locale) ? "rtl" : "ltr";
  const { document, customers } = await loadStep1Data(document_id, locale);

  return (
    <FlowKundeStep
      dir={dir}
      locale={locale}
      documentId={document_id}
      initialDocType={document.documentType}
      initialCustomerId={document.customerId}
      customers={customers}
    />
  );
}
