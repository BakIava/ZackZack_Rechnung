import { Sidebar } from "@/components/layout/sidebar";
import type { PflichtCheck } from "@/lib/legal/dokument-pflicht";
import type { DocumentPreview } from "@/types/document";
import { Step3Main } from "./step3-main";
// Gemeinsame Shell-Styles (Scope-Fläche, Sidebar+Main-Split, Topbar).
import "@/components/layout/app-shell.css";
import "./step3-screen.css";

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
