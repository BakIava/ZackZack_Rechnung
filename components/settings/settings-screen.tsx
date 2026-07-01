import { Sidebar } from "../dashboard/sidebar";
import { SettingsMain } from "./settings-main";
import type { SettingsData } from "@/lib/settings/types";
import "../dashboard/dashboard.css";
import "./settings.css";

interface SettingsScreenProps {
  dir: "ltr" | "rtl";
  locale: string;
  data: SettingsData;
}

function toInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

export function SettingsScreen({ dir, locale, data }: SettingsScreenProps) {
  const { company } = data;
  const sidebarData = {
    companyName: company.name,
    companyInitials: toInitials(company.name),
    director: company.director ?? "",
    customerCount: 0,
    catalogCount: 0,
    recentDocs: [],
    docs: [],
    openCount: 0,
    openSumCents: 0,
    paidSumCents: 0,
  };

  return (
    <div className="zz-settings">
      <div className="dapp" dir={dir}>
        <Sidebar active="settings" data={sidebarData} />
        <SettingsMain dir={dir} locale={locale} data={data} />
      </div>
    </div>
  );
}
