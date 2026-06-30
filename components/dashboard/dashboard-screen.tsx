import { DashboardMain } from "./dashboard-main";
import { Sidebar } from "./sidebar";
import "./dashboard.css";
import type { DashboardData } from "@/lib/dashboard/fetch";

interface DashboardScreenProps {
  dir: "ltr" | "rtl";
  data: DashboardData;
}

/** Desktop-Dashboard: Sidebar + Hauptbereich, vollflächig. Dokumentinhalt
 *  bleibt Deutsch; die Bedienoberfläche folgt der gewählten Sprache. */
export async function DashboardScreen({ dir, data }: DashboardScreenProps) {
  return (
    <div className="zz-dash">
      <div className="dapp" dir={dir}>
        <Sidebar active="dashboard" data={data} />
        <DashboardMain dir={dir} data={data} />
      </div>
    </div>
  );
}
