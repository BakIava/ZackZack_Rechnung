import type { ReactNode } from "react";
import { Hanken_Grotesk, IBM_Plex_Sans_Arabic } from "next/font/google";
import { setRequestLocale } from "next-intl/server";
import { isRtlLocale } from "@/i18n/routing";
import { Sidebar } from "@/components/layout/sidebar";
import { AppShell } from "@/components/layout/app-shell";

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

interface AppLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

/**
 * Gemeinsames Layout für Dashboard, Kunden, Katalog, Dokumente und Einstellungen.
 * Die Sidebar wird einmal gerendert und bleibt beim Seitenwechsel erhalten.
 */
export default async function AppLayout({ children, params }: AppLayoutProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const dir = isRtlLocale(locale) ? "rtl" : "ltr";
  const fontClasses = `${hanken.variable} ${plexArabic.variable}`;

  return (
    <AppShell dir={dir} fontClasses={fontClasses}>
      <Sidebar />
      {children}
    </AppShell>
  );
}
