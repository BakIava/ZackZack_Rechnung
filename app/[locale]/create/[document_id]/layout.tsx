import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getFlowDocMeta } from "@/lib/repositories/documents";
import { ActivityTracker } from "@/components/shared/activity-tracker";
import "@/components/layout/app-shell.css";

// Draft-Validierung + Redirect sind pro Request – nie statisch vorrendern.
export const dynamic = "force-dynamic";

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

  return (
    <>
      <ActivityTracker locale={locale} />
      {children}
    </>
  );
}
