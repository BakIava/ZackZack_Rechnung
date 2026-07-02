import { DashboardMain } from "./dashboard-main";
import type { DashboardData } from "@/lib/dashboard/fetch";

interface DashboardScreenProps {
  dir: "ltr" | "rtl";
  data: DashboardData;
}

export async function DashboardScreen({ dir, data }: DashboardScreenProps) {
  return <DashboardMain dir={dir} data={data} />;
}
