import { CatalogMasterDetail } from "./catalog-master-detail";
import "./catalog-screen.css";

interface CatalogScreenProps {
  dir: "ltr" | "rtl";
}

export function CatalogScreen({ dir }: CatalogScreenProps) {
  return <CatalogMasterDetail dir={dir} />;
}
