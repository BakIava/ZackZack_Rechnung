import { setRequestLocale } from "next-intl/server";
import { PlaceholderScreen } from "@/components/layout/placeholder-screen";
import { AppNav } from "@/components/layout/app-nav";
import { routing } from "@/i18n/routing";

type Props = { params: Promise<{ locale: string }> };

export default async function DocumentsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="mx-auto max-w-2xl p-6">
      <AppNav className="mb-6" />
      <PlaceholderScreen titleKey="documents" />
    </div>
  );
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
