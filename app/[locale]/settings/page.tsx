import { redirect } from "next/navigation";
import { Hanken_Grotesk, IBM_Plex_Sans_Arabic } from "next/font/google";
import { setRequestLocale } from "next-intl/server";
import { SettingsScreen } from "@/components/settings/settings-screen";
import { routing, isRtlLocale } from "@/i18n/routing";
import { getSettingsData } from "@/lib/settings/queries";

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

type Props = { params: Promise<{ locale: string }> };

export default async function SettingsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const dir = isRtlLocale(locale) ? "rtl" : "ltr";

  const result = await getSettingsData();

  if (!result.ok) {
    if (result.reason === "unauthenticated") redirect(`/${locale}/login`);
    // no_profile or db_error: show error in settings shell instead of login loop
    return (
      <div className={`${hanken.variable} ${plexArabic.variable}`}>
        <p style={{ padding: "2rem", color: "red" }}>
          Einstellungen konnten nicht geladen werden ({result.reason}
          {result.detail ? `: ${result.detail}` : ""}).
        </p>
      </div>
    );
  }

  return (
    <div className={`${hanken.variable} ${plexArabic.variable}`}>
      <SettingsScreen dir={dir} locale={locale} data={result.data} />
    </div>
  );
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
