import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Step3Screen } from "@/components/create/step3-screen";
import { getDocumentPreview } from "@/lib/documents/preview-queries";
import { pruefeDokumentPflicht } from "@/lib/legal/dokumentPflicht";
import { isRtlLocale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

interface Step3PageProps {
  params: Promise<{ locale: string; document_id: string }>;
}

export default async function Step3Page({ params }: Step3PageProps) {
  const { locale, document_id } = await params;
  setRequestLocale(locale);
  const dir = isRtlLocale(locale) ? "rtl" : "ltr";

  // Vorschau lädt jeden Status (Entwurf wie finalisiert – Ansichtsmodus).
  const preview = await getDocumentPreview(document_id);
  if (!preview) redirect(`/${locale}/documents`);

  // Pflichtangaben-Check serverseitig – blockt Finalisieren bis alles grün ist.
  // Empfängerangaben sind betragsabhängig (Kleinbetragsrechnung bis 250 €).
  const totalAmountCents = preview.items.reduce((sum, p) => sum + p.totalAmount, 0);
  const checks = pruefeDokumentPflicht({
    companyName: preview.company.name,
    companyStreet: preview.company.street,
    companyPostcode: preview.company.postcode,
    companyCity: preview.company.city,
    companySteuernummer: preview.company.steuernummer,
    companyUstId: preview.company.ustId,
    issueDate: preview.issueDate,
    itemCount: preview.items.length,
    totalAmountCents,
    customerName: preview.customer?.name ?? null,
    customerStreet: preview.customer?.street ?? null,
    customerStreetNo: preview.customer?.streetNo ?? null,
    customerPostcode: preview.customer?.postcode ?? null,
    customerCity: preview.customer?.city ?? null,
  });

  return <Step3Screen dir={dir} preview={preview} checks={checks} />;
}
