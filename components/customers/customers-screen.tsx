import { Sidebar } from "../dashboard/sidebar";
import { CustomersMasterDetail } from "./customers-master-detail";
import type { CustomerRow } from "@/lib/customers/types";
import "../dashboard/dashboard.css";
import "./customers.css";

interface CustomersScreenProps {
  dir: "ltr" | "rtl";
  customers: CustomerRow[];
}

export function CustomersScreen({ dir, customers }: CustomersScreenProps) {
  return (
    <div className="zz-cust">
      <div className="dapp" dir={dir}>
        <Sidebar active="customers" />
        <CustomersMasterDetail dir={dir} initialCustomers={customers} />
      </div>
    </div>
  );
}
