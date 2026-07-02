import { redirect } from "next/navigation";
import { Hanken_Grotesk, IBM_Plex_Sans_Arabic } from "next/font/google";
import { setRequestLocale } from "next-intl/server";
import { Step3Screen } from "@/components/create/step3-screen";
import { Sidebar } from "@/components/dashboard/sidebar";
import { KundeStep } from "@/components/flow/KundeStep";
import { Step2Screen } from "@/components/flow/step2-screen";
import { createDraft } from "@/lib/documents/draft-actions";
import { getDraftForStep1 } from "@/lib/documents/queries";
import { getCustomerSummaries } from "@/lib/customers/queries";
import { isRtlLocale, routing, type Locale } from "@/i18n/routing";
import "@/components/dashboard/dashboard.css";

export const dynamic = "force-dynamic";

const TOTAL_STEPS = 3;

const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const plexArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-plex-arabic",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
});

interface CreateStepPageProps {
  params: Promise<{ locale: string; step: string }>;
  searchParams: Promise<{ document_id?: string }>;
}

export default async function CreateStepPage({ params, searchParams }: CreateStepPageProps) {
  const { locale, step } = await params;
  setRequestLocale(locale);
  const dir = isRtlLocale(locale) ? "rtl" : "ltr";
  const current = Math.min(Math.max(Number(step) || 1, 1), TOTAL_STEPS);
  const sp = await searchParams;
  const fonts = `${hanken.variable} ${plexArabic.variable}`;

  if (current === 2) {
    return (
      <div className={fonts}>
        <Step2Screen dir={dir} locale={locale as Locale} documentId={sp.document_id} />
      </div>
    );
  }

  if (current === 3) {
    return (
      <div className={fonts}>
        <Step3Screen dir={dir} documentId={sp.document_id} />
      </div>
    );
  }

  // Schritt 1 — Draft anlegen oder bestehenden öffnen
  if (!sp.document_id) {
    const draft = await createDraft();
    if ("error" in draft) {
      redirect(`/${locale}/documents`);
    }
    redirect(`/${locale}/create/1?document_id=${draft.id}`);
  }

  // document_id ist jetzt gesetzt (TypeScript weiß das dank never-Typ von redirect)
  const [draftData, customers] = await Promise.all([
    getDraftForStep1(sp.document_id),
    getCustomerSummaries(),
  ]);

  // Draft nicht gefunden (abgelaufen, anderer Nutzer, etc.) → neu anlegen
  if (!draftData) {
    const draft = await createDraft();
    if ("error" in draft) {
      redirect(`/${locale}/documents`);
    }
    redirect(`/${locale}/create/1?document_id=${draft.id}`);
  }

  return (
    <div className={fonts}>
      <div className="zz-dash">
        <div className="dapp" dir={dir}>
          <Sidebar />
          <KundeStep
            dir={dir}
            customers={customers}
            documentId={draftData.id}
            initialCustomerId={draftData.customerId}
            initialDocType={draftData.docType}
          />
        </div>
      </div>
    </div>
  );
}

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    ["1", "2", "3"].map((step) => ({ locale, step })),
  );
}

