import { setRequestLocale } from "next-intl/server";
import { isRtlLocale, routing } from "@/i18n/routing";
import { CustomersScreen } from "@/components/customers/customers-screen";
import { getCustomers } from "@/lib/customers/queries";

type Props = { params: Promise<{ locale: string }> };

export default async function CustomersPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const dir = isRtlLocale(locale) ? "rtl" : "ltr";
  const customers = await getCustomers();

  return <CustomersScreen dir={dir} customers={customers} />;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
