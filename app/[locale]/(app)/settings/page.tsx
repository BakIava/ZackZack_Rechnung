import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isRtlLocale, routing } from "@/i18n/routing";
import { SettingsScreen } from "@/components/settings/settings-screen";
import { getSettingsData } from "@/lib/repositories/companies";

type Props = { params: Promise<{ locale: string }> };

export default async function SettingsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const dir = isRtlLocale(locale) ? "rtl" : "ltr";

  const result = await getSettingsData();

  if (!result.ok) {
    if (result.reason === "unauthenticated") redirect(`/${locale}/login`);
    return (
      <p className="p-8 text-red-600">
        Einstellungen konnten nicht geladen werden ({result.reason}
        {result.detail ? `: ${result.detail}` : ""}).
      </p>
    );
  }

  return <SettingsScreen dir={dir} locale={locale} data={result.data} />;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
