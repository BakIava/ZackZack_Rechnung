import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Sidebar } from "@/components/layout/sidebar";
import { KundeStep } from "@/components/create/1/kunde-step";
import { getDraft, getFlowDocMeta } from "@/lib/repositories/documents";
import { getCustomerSummaries } from "@/lib/repositories/customers";
import { isRtlLocale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

interface Step1PageProps {
  params: Promise<{ locale: string; document_id: string }>;
}

export default async function Step1Page({ params }: Step1PageProps) {
  const { locale, document_id } = await params;
  setRequestLocale(locale);
  const dir = isRtlLocale(locale) ? "rtl" : "ltr";

  // Finalisierte Dokumente sind unveränderbar → in den Ansichtsmodus (Schritt 3).
  const meta = await getFlowDocMeta(document_id);
  if (meta && meta.status !== "draft") {
    redirect(`/${locale}/create/${document_id}/3`);
  }

  // getDraft ist per React cache dedupliziert – Layout hat bereits geladen.
  const [draft, customers] = await Promise.all([
    getDraft(document_id),
    getCustomerSummaries(),
  ]);  

  // Layout garantiert einen gültigen Draft; Fallback nur zur Typsicherheit.
  const initialDocType = draft?.docType ?? "invoice";
  const initialCustomerId = draft?.customerId ?? null;
  const initialIssueDate = draft?.issueDate ?? "";
  const initialValidUntil = draft?.validUntil ?? null;
  const documentTypeLocked = draft?.documentTypeLocked ?? false;

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
          issueDate={initialIssueDate}
          initialValidUntil={initialValidUntil}
          documentTypeLocked={documentTypeLocked}
        />
      </div>
    </div>
  );
}
