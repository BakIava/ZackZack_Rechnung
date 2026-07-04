import { setRequestLocale } from "next-intl/server";
import { Sidebar } from "@/components/dashboard/sidebar";
import { KundeStep } from "@/components/flow/KundeStep";
import { getDraft } from "@/lib/documents/queries";
import { getCustomerSummaries } from "@/lib/customers/queries";
import { isRtlLocale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

interface Step1PageProps {
  params: Promise<{ locale: string; document_id: string }>;
}

export default async function Step1Page({ params }: Step1PageProps) {
  const { locale, document_id } = await params;
  setRequestLocale(locale);
  const dir = isRtlLocale(locale) ? "rtl" : "ltr";

  // getDraft ist per React cache dedupliziert – Layout hat bereits geladen.
  const [draft, customers] = await Promise.all([
    getDraft(document_id),
    getCustomerSummaries(),
  ]);

  // Layout garantiert einen gültigen Draft; Fallback nur zur Typsicherheit.
  const initialDocType = draft?.docType ?? "rechnung";
  const initialCustomerId = draft?.customerId ?? null;

  return (
    <div className="zz-dash">
      <div className="dapp" dir={dir}>
        <Sidebar />
        <KundeStep
          dir={dir}
          customers={customers}
          documentId={document_id}
          initialCustomerId={initialCustomerId}
          initialDocType={initialDocType}
        />
      </div>
    </div>
  );
}
