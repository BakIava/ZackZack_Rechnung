import { Sidebar } from "@/components/layout/sidebar";
import type { Locale } from "@/i18n/routing";
import type { KatalogEintrag } from "@/types/service";
import type { DocumentPreview, DraftItem } from "@/types/document";
import type { PdfLogo } from "@/lib/pdf/pdf-logo";
import { Step2Main } from "./step2-main";
import "@/components/layout/app-shell.css";

interface Step2ScreenProps {
  dir: "ltr" | "rtl";
  locale: Locale;
  documentId: string;
  initialPreview: DocumentPreview;
  initialItems: DraftItem[];
  logo: PdfLogo | null;
  services: KatalogEintrag[];
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
}: Step2ScreenProps) {
  return (
    <div className="zz-dash">
      <div className="dapp" dir={dir}>
        <Sidebar collapsed />
        <Step2Main
          dir={dir}
          locale={locale}
          documentId={documentId}
          initialPreview={initialPreview}
          initialItems={initialItems}
          logo={logo}
          services={services}
        />
      </div>
    </div>
  );
}
