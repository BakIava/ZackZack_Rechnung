import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Step3Screen } from "@/components/create/3/step3-screen";
import { getDocumentPreview } from "@/lib/repositories/document-previews";
import { getPreviewPflichtChecks } from "@/lib/documents/finalize-validation";
import { isRtlLocale } from "@/i18n/routing";
import { loadPdfLogo } from "@/lib/pdf/document-logo";

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
  const logo = await loadPdfLogo(preview.company.logoUrl);

  // Pflichtangaben-Check serverseitig – blockt Finalisieren bis alles grün ist.
  // Empfängerangaben sind betragsabhängig (Kleinbetragsrechnung bis 250 €).
  const checks = getPreviewPflichtChecks(preview);

  return <Step3Screen dir={dir} preview={preview} logo={logo} checks={checks} />;
}
