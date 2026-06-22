import { Hanken_Grotesk, IBM_Plex_Sans_Arabic } from "next/font/google";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AppNav } from "@/components/layout/app-nav";
import { PlaceholderScreen } from "@/components/layout/placeholder-screen";
import { Step3Screen } from "@/components/create/step3-screen";
import { StepHeader } from "@/components/ui";
import { isRtlLocale, routing } from "@/i18n/routing";

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
}

export default async function CreateStepPage({ params }: CreateStepPageProps) {
  const { locale, step } = await params;
  setRequestLocale(locale);

  const current = Math.min(Math.max(Number(step) || 1, 1), TOTAL_STEPS);

  // Schritt 3 (Vorschau & Versand) ist als vollflächiger Screen umgesetzt.
  if (current === 3) {
    const dir = isRtlLocale(locale) ? "rtl" : "ltr";
    return (
      <div className={`${hanken.variable} ${plexArabic.variable}`}>
        <Step3Screen dir={dir} />
      </div>
    );
  }

  const t = await getTranslations("Create");

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <AppNav />
      <StepHeader step={current} total={TOTAL_STEPS} title={t("title")} />
      <PlaceholderScreen titleKey="create" />
    </div>
  );
}

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    ["1", "2", "3"].map((step) => ({ locale, step })),
  );
}
