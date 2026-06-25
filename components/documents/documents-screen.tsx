import { Sidebar } from "@/components/dashboard/sidebar";
import { DocumentsMain } from "./documents-main";
import "@/components/dashboard/dashboard.css";

interface DocumentsScreenProps {
  dir: "ltr" | "rtl";
}

/** Desktop-Dokumente-Screen: Sidebar + Hauptbereich (Liste + Detail-Panel). */
export function DocumentsScreen({ dir }: DocumentsScreenProps) {
  return (
    <div className="zz-dash">
      <div className="dapp" dir={dir}>
        <Sidebar active="history" />
        <DocumentsMain dir={dir} />
      </div>
    </div>
  );
}
