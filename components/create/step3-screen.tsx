import { Sidebar } from "@/components/dashboard/sidebar";
import { Step3Main } from "./step3-main";
// Gemeinsame Sidebar-/Shell-Styles (Sidebar wird aus dem Dashboard wiederverwendet).
import "@/components/dashboard/dashboard.css";
import "./step3.css";

interface Step3ScreenProps {
  dir: "ltr" | "rtl";
  documentId?: string;
}

/** Schritt 3 (Vorschau & Versand) — Desktop: Sidebar + Hauptbereich, vollflächig.
 *  Dokumentinhalt bleibt Deutsch/LTR; die Bedienoberfläche folgt der Sprache. */
export function Step3Screen({ dir, documentId }: Step3ScreenProps) {
  return (
    <div className="zz-create">
      <div className="dapp" dir={dir}>
        <Sidebar />
        <Step3Main dir={dir} documentId={documentId} />
      </div>
    </div>
  );
}
