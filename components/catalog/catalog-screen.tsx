import { Sidebar } from "../dashboard/sidebar";
import { CatalogMasterDetail } from "./catalog-master-detail";
import "../dashboard/dashboard.css";
import "./catalog-screen.css";

interface CatalogScreenProps {
  dir: "ltr" | "rtl";
}

export function CatalogScreen({ dir }: CatalogScreenProps) {
  return (
    <div className="zz-catalog">
      <div className="dapp" dir={dir}>
        <Sidebar active="catalog" />
        <CatalogMasterDetail dir={dir} />
      </div>
    </div>
  );
}
