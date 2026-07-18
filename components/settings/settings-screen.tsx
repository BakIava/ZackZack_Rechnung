import { SettingsMain } from "./settings-main";
import type { SettingsData } from "@/types/company";

interface SettingsScreenProps {
  dir: "ltr" | "rtl";
  locale: string;
  data: SettingsData;
}

export function SettingsScreen({ dir, locale, data }: SettingsScreenProps) {
  return <SettingsMain dir={dir} locale={locale} data={data} />;
}
