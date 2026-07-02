import { DocumentsMain } from "./documents-main";

interface DocumentsScreenProps {
  dir: "ltr" | "rtl";
}

export function DocumentsScreen({ dir }: DocumentsScreenProps) {
  return <DocumentsMain dir={dir} />;
}
