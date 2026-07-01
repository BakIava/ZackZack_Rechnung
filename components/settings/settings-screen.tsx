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

export function SettingsScreen({ dir, locale, data }: SettingsScreenProps) {
  return (
    <div className="zz-settings">
      <div className="dapp" dir={dir}>
        <Sidebar active="settings" />
        <SettingsMain dir={dir} locale={locale} data={data} />
      </div>
    </div>
  );
}
