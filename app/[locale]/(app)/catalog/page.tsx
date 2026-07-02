import { setRequestLocale } from "next-intl/server";
import { isRtlLocale, routing } from "@/i18n/routing";
import { CatalogScreen } from "@/components/catalog/catalog-screen";
import { getServices } from "@/lib/services/queries";

type Props = { params: Promise<{ locale: string }> };

export default async function CatalogPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const dir = isRtlLocale(locale) ? "rtl" : "ltr";
  const initialItems = await getServices();

  return <CatalogScreen dir={dir} initialItems={initialItems} />;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
