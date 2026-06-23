import { Sidebar } from "../dashboard/sidebar";
import { CustomersMasterDetail } from "./customers-master-detail";
import "../dashboard/dashboard.css";
import "./customers.css";

interface CustomersScreenProps {
  dir: "ltr" | "rtl";
}

/** Desktop-Kundenbereich: Sidebar + Master-Detail, vollflächig. Bediensprache
 *  folgt der UI-Sprache; Beträge und Daten bleiben deutsch. */
export function CustomersScreen({ dir }: CustomersScreenProps) {
  return (
    <div className="zz-cust">
      <div className="dapp" dir={dir}>
        <Sidebar active="customers" />
        <CustomersMasterDetail dir={dir} />
      </div>
    </div>
  );
}
