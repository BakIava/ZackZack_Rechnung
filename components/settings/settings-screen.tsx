import { Sidebar } from "../dashboard/sidebar";
import { SettingsMain } from "./settings-main";
import "../dashboard/dashboard.css";
import "./settings.css";

interface SettingsScreenProps {
  dir: "ltr" | "rtl";
  locale: string;
}

export function SettingsScreen({ dir, locale }: SettingsScreenProps) {
  return (
    <div className="zz-settings">
      <div className="dapp" dir={dir}>
        <Sidebar active="settings" />
        <SettingsMain dir={dir} locale={locale} />
      </div>
    </div>
  );
}
