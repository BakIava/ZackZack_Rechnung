import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";

type Props = { params: Promise<{ locale: string }> };

export default async function LoginPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Login");

  return (
    <div>
      <h1>{t("title")}</h1>
      <form>
        <input type="email" placeholder={t("emailPlaceholder")} />
        <input type="text" placeholder={t("codePlaceholder")} />
        <Link href={`/${locale}/dashboard`}>
          <button type="button">{t("submit")}</button>
        </Link>
        <Link href="/language">{t("changeLanguage")}</Link>
      </form>
    </div>
  );
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
