import { Hanken_Grotesk, IBM_Plex_Sans_Arabic } from "next/font/google";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AppNav } from "@/components/layout/app-nav";
import { PlaceholderScreen } from "@/components/layout/placeholder-screen";
import { Step2Screen } from "@/components/flow/step2-screen";
import { StepHeader } from "@/components/ui";
import { routing, isRtlLocale, type Locale } from "@/i18n/routing";

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

  // Schritt 2 (Positionen) ist als vollflächiger Desktop-Screen umgesetzt.
  if (current === 2) {
    const dir = isRtlLocale(locale) ? "rtl" : "ltr";
    return (
      <div className={`${hanken.variable} ${plexArabic.variable}`}>
        <Step2Screen dir={dir} locale={locale as Locale} />
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
