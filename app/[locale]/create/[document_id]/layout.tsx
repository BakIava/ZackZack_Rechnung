import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { Hanken_Grotesk, IBM_Plex_Sans_Arabic } from "next/font/google";
import { setRequestLocale } from "next-intl/server";
import { getFlowDocMeta } from "@/lib/repositories/documents";
import "@/components/layout/app-shell.css";

// Draft-Validierung + Redirect sind pro Request – nie statisch vorrendern.
export const dynamic = "force-dynamic";

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

interface CreateLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string; document_id: string }>;
}

/**
 * Gemeinsames Layout des Flows. Validiert nur Zugehörigkeit + Existenz (eigene
 * Firma, beliebiger Status). Fremde/nicht existierende Dokumente → zurück zur
 * Dokumentenliste. Die Unveränderbarkeit finalisierter Dokumente erzwingen die
 * einzelnen Schritte selbst: Schritt 1 + 2 leiten bei status != 'draft' auf
 * Schritt 3 (Ansichtsmodus) um; Schritt 3 ist für jeden Status erreichbar.
 */
export default async function CreateLayout({ children, params }: CreateLayoutProps) {
  const { locale, document_id } = await params;
  setRequestLocale(locale);

  const meta = await getFlowDocMeta(document_id);
  if (!meta) redirect(`/${locale}/documents`);

  return <div className={`${hanken.variable} ${plexArabic.variable}`}>{children}</div>;
}
