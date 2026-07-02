import { setRequestLocale } from "next-intl/server";
import { isRtlLocale, routing } from "@/i18n/routing";
import { DashboardScreen } from "@/components/dashboard/dashboard-screen";
import { fetchDashboardData } from "@/lib/dashboard/fetch";

type Props = { params: Promise<{ locale: string }> };

export default async function DashboardPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const dir = isRtlLocale(locale) ? "rtl" : "ltr";
  const data = await fetchDashboardData();

  return <DashboardScreen dir={dir} data={data} />;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
