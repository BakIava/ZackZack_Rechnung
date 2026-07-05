import { DocumentsMain } from "./documents-main";
import type { DocumentListItem } from "@/lib/documents/types";

interface DocumentsScreenProps {
  dir: "ltr" | "rtl";
  documents: DocumentListItem[];
  paymentDays: number;
  companyName: string;
}

/** Dokumente-Screen: delegiert an DocumentsMain. Sidebar kommt vom (app)-Layout. */
export function DocumentsScreen({ dir, documents, paymentDays, companyName }: DocumentsScreenProps) {
  return (
    <DocumentsMain
      dir={dir}
      documents={documents}
      paymentDays={paymentDays}
      companyName={companyName}
    />
  );
}
