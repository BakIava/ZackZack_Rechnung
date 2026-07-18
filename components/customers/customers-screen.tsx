import { CustomersMasterDetail } from "./customers-master-detail";
import type { CustomerRow } from "@/types/customer";

interface CustomersScreenProps {
  dir: "ltr" | "rtl";
  customers: CustomerRow[];
}

export function CustomersScreen({ dir, customers }: CustomersScreenProps) {
  return <CustomersMasterDetail dir={dir} initialCustomers={customers} />;
}
