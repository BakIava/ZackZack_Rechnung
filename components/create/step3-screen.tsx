import { Sidebar } from "@/components/dashboard/sidebar";
import type { PflichtCheck } from "@/lib/legal/dokumentPflicht";
import type { DocumentPreview } from "@/lib/documents/preview-types";
import { Step3Main } from "./step3-main";
// Gemeinsame Sidebar-/Shell-Styles (Sidebar wird aus dem Dashboard wiederverwendet).
import "@/components/dashboard/dashboard.css";
import "./step3.css";

interface Step3ScreenProps {
  dir: "ltr" | "rtl";
  preview: DocumentPreview;
  checks: PflichtCheck[];
}

/** Schritt 3 (Vorschau & Finalisierung) — Desktop: Sidebar + Hauptbereich, vollflächig.
 *  Dokumentinhalt bleibt Deutsch/LTR; die Bedienoberfläche folgt der Sprache. */
export function Step3Screen({ dir, preview, checks }: Step3ScreenProps) {
  return (
    <div className="zz-create">
      <div className="dapp" dir={dir}>
        <Sidebar />
        <Step3Main dir={dir} preview={preview} checks={checks} />
      </div>
    </div>
  );
}
