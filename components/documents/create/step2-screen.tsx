import { Sidebar } from "@/components/layout/sidebar";
import type { Locale } from "@/i18n/routing";
import type { KatalogEintrag } from "@/types/service";
import type { DraftContext, DraftItem } from "@/types/document";
import { Step2Main } from "./step2-main";
import "@/components/dashboard/dashboard.css";
import "./step2.css";

interface Step2ScreenProps {
  dir: "ltr" | "rtl";
  locale: Locale;
  documentId: string;
  context: DraftContext;
  initialItems: DraftItem[];
  services: KatalogEintrag[];
}

/** Desktop-Schritt 2 (Positionen): Sidebar + Hauptbereich, vollflächig.
 *  Bedienoberfläche folgt der Sprache; Dokumentinhalt bleibt Deutsch. */
export function Step2Screen({
  dir,
  locale,
  documentId,
  context,
  initialItems,
  services,
}: Step2ScreenProps) {
  return (
    <div className="zz-dash">
      <div className="dapp" dir={dir}>
        <Sidebar />
        <Step2Main
          dir={dir}
          locale={locale}
          documentId={documentId}
          context={context}
          initialItems={initialItems}
          services={services}
        />
      </div>
    </div>
  );
}
