import type { ReactNode } from "react";
import { setRequestLocale } from "next-intl/server";
import { isRtlLocale } from "@/i18n/routing";
import { Sidebar } from "@/components/layout/sidebar";
import { AppShell } from "@/components/layout/app-shell";

interface AppLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

/**
 * Gemeinsames Layout für Dashboard, Kunden, Katalog und Dokumente.
 * Die Sidebar wird einmal gerendert und bleibt beim Seitenwechsel erhalten.
 */
export default async function AppLayout({ children, params }: AppLayoutProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const dir = isRtlLocale(locale) ? "rtl" : "ltr";

  return (
    <AppShell dir={dir} locale={locale}>
      <Sidebar />
      {children}
    </AppShell>
  );
}
