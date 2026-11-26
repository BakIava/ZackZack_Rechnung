import { Sidebar } from "@/components/layout/sidebar";
import type { Locale } from "@/i18n/routing";
import type { KatalogEintrag } from "@/types/service";
import type { DocumentPreview, DraftItem } from "@/types/document";
import type { PdfLogo } from "@/lib/pdf/pdf-logo";
import { Step2Main } from "./step2-main";
import { Step2Frame } from "./step2-frame";

interface Step2ScreenProps {
  dir: "ltr" | "rtl";
  locale: Locale;
  documentId: string;
  initialPreview: DocumentPreview;
  initialItems: DraftItem[];
  logo: PdfLogo | null;
  services: KatalogEintrag[];
  /** Firma – trennt den Browser-Speicher des Nachweis-Reiters. */
  cacheScope: string;
  /** Entwurf ohne Nummer und ohne Verknüpfung – zeigt „Löschen". */
  deletable: boolean;
}

/** Desktop-Schritt 2 (Positionen): Sidebar + Hauptbereich, vollflächig.
 *  Bedienoberfläche folgt der Sprache; Dokumentinhalt bleibt Deutsch. */
export function Step2Screen({
  dir,
  locale,
  documentId,
  initialPreview,
  initialItems,
  logo,
  services,
  cacheScope,
  deletable,
}: Step2ScreenProps) {
  return (
    <Step2Frame dir={dir} sidebar={<Sidebar startCollapsed />}>
      <Step2Main
        dir={dir}
        locale={locale}
        documentId={documentId}
        initialPreview={initialPreview}
        initialItems={initialItems}
        logo={logo}
        services={services}
        cacheScope={cacheScope}
        deletable={deletable}
      />
    </Step2Frame>
  );
}
