import { Hanken_Grotesk, IBM_Plex_Sans_Arabic } from "next/font/google";
import { setRequestLocale } from "next-intl/server";
import { Sidebar } from "@/components/dashboard/sidebar";
import { CreatePlaceholder } from "@/components/flow/CreatePlaceholder";
import { KundeStep } from "@/components/flow/KundeStep";
import { routing, isRtlLocale } from "@/i18n/routing";
import "@/components/dashboard/dashboard.css";

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
  const dir = isRtlLocale(locale) ? "rtl" : "ltr";
  const current = Math.min(Math.max(Number(step) || 1, 1), TOTAL_STEPS);

  return (
    <div className={`${hanken.variable} ${plexArabic.variable}`}>
      <div className="zz-dash">
        <div className="dapp" dir={dir}>
          <Sidebar active={null} />
          {current === 1 ? (
            <KundeStep dir={dir} />
          ) : (
            <CreatePlaceholder step={current} />
          )}
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
