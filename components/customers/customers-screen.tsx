import { CustomersMasterDetail } from "./customers-master-detail";
import type { CustomerRow } from "@/lib/customers/types";
import "./customers.css";

interface CustomersScreenProps {
  dir: "ltr" | "rtl";
  customers: CustomerRow[];
}

export function CustomersScreen({ dir, customers }: CustomersScreenProps) {
  return <CustomersMasterDetail dir={dir} initialCustomers={customers} />;
}
