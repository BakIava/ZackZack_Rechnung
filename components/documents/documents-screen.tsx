import { DocumentsMain } from "./documents-main";
import type { DocumentListItem } from "@/types/document";

interface DocumentsScreenProps {
  dir: "ltr" | "rtl";
  documents: DocumentListItem[];
  paymentDays: number;
  companyName: string;
  /** Über /documents/[document_id] direkt geöffnetes Dokument; null → nichts vorausgewählt. */
  initialSelectedId?: string | null;
}

/** Dokumente-Screen: delegiert an DocumentsMain. Sidebar kommt vom (app)-Layout. */
export function DocumentsScreen({
  dir,
  documents,
  paymentDays,
  companyName,
  initialSelectedId = null,
}: DocumentsScreenProps) {
  return (
    <DocumentsMain
      dir={dir}
      documents={documents}
      paymentDays={paymentDays}
      companyName={companyName}
      initialSelectedId={initialSelectedId}
    />
  );
}
