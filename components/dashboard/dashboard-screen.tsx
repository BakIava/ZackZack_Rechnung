import { DashboardMain } from "./dashboard-main";
import { Sidebar } from "./sidebar";
import "./dashboard.css";

interface DashboardScreenProps {
  dir: "ltr" | "rtl";
}

/** Desktop-Dashboard: Sidebar + Hauptbereich, vollflächig. Dokumentinhalt
 *  bleibt Deutsch; die Bedienoberfläche folgt der gewählten Sprache. */
export async function DashboardScreen({ dir }: DashboardScreenProps) {
  return (
    <div className="zz-dash">
      <div className="dapp" dir={dir}>
        <Sidebar active="dashboard" />
        <DashboardMain dir={dir} />
      </div>
    </div>
  );
}
