import { Sidebar } from "@/components/dashboard/sidebar";
import type { Locale } from "@/i18n/routing";
import { Step2Main } from "./step2-main";
import "@/components/dashboard/dashboard.css";
import "./step2.css";

interface Step2ScreenProps {
  dir: "ltr" | "rtl";
  locale: Locale;
}

/** Desktop-Schritt 2 (Positionen): Sidebar + Hauptbereich, vollflächig.
 *  Bedienoberfläche folgt der Sprache; Dokumentinhalt bleibt Deutsch. */
export function Step2Screen({ dir, locale }: Step2ScreenProps) {
  return (
    <div className="zz-dash">
      <div className="dapp" dir={dir}>
        <Sidebar />
        <Step2Main dir={dir} locale={locale} />
      </div>
    </div>
  );
}
