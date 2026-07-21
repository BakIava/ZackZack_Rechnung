import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";

interface HomePageProps {
  params: Promise<{ locale: string }>;
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Die Auth- und Zielentscheidung passiert zentral in der Middleware.
  redirect(`/${locale}/dashboard`);
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
