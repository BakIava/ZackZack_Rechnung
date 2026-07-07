import type { KatalogEintrag } from "@/types/service";
import { CatalogMasterDetail } from "./catalog-master-detail";
import "./catalog-screen.css";

interface CatalogScreenProps {
  dir: "ltr" | "rtl";
  initialItems: KatalogEintrag[];
}

export function CatalogScreen({ dir, initialItems }: CatalogScreenProps) {
  return <CatalogMasterDetail dir={dir} initialItems={initialItems} />;
}
