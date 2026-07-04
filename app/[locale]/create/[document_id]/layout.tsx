import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { Hanken_Grotesk, IBM_Plex_Sans_Arabic } from "next/font/google";
import { setRequestLocale } from "next-intl/server";
import { getDraft } from "@/lib/documents/queries";
import "@/components/dashboard/dashboard.css";

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
 * Gemeinsames Layout des Draft-Flows. Lädt das Draft-Dokument einmal und
 * validiert: gehört zur eigenen Firma UND status='draft'. Fremde oder bereits
 * finalisierte Dokumente sind nicht aufrufbar → zurück zur Dokumentenliste.
 * Der Schritt-Indikator (1/2/3) wird aus FLOW_STEPS gespeist und je Schritt in
 * den Screens dargestellt (nur der jeweilige Screen kennt seinen Schritt).
 */
export default async function CreateLayout({ children, params }: CreateLayoutProps) {
  const { locale, document_id } = await params;
  setRequestLocale(locale);

  const draft = await getDraft(document_id);
  if (!draft) redirect(`/${locale}/documents`);

  return <div className={`${hanken.variable} ${plexArabic.variable}`}>{children}</div>;
}
