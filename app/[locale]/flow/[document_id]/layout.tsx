import type { ReactNode } from "react";
import { Hanken_Grotesk, IBM_Plex_Sans_Arabic } from "next/font/google";
import { setRequestLocale } from "next-intl/server";
import { isRtlLocale } from "@/i18n/routing";
import { FlowShell } from "@/components/flow/FlowShell";

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

interface FlowLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string; document_id: string }>;
}

export default async function FlowLayout({ children, params }: FlowLayoutProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const dir = isRtlLocale(locale) ? "rtl" : "ltr";
  const fontClasses = `${hanken.variable} ${plexArabic.variable}`;

  return (
    <FlowShell dir={dir} fontClasses={fontClasses}>
      {children}
    </FlowShell>
  );
}
