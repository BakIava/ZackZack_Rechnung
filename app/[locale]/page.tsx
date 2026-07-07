import { FileDown } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { RtlDemoCard } from "@/components/shared/rtl-demo-card";
import { AppNav } from "@/components/layout/app-nav";
import { Button, buttonVariants, Input, LangSwitch } from "@/components/ui";
import { cn } from "@/lib/utils";
import { routing } from "@/i18n/routing";

interface HomePageProps {
  params: Promise<{ locale: string }>;
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Home");
  const tCommon = await getTranslations("Common");

  return (
    <div className="mx-auto flex min-h-svh max-w-2xl flex-col gap-8 p-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{tCommon("appName")}</p>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="mt-2 text-muted-foreground">{t("subtitle")}</p>
        </div>
        <LangSwitch />
      </header>

      <AppNav />

      <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold">{t("touchUiTitle")}</h2>
        <Input
          touch
          placeholder={t("customerNamePlaceholder")}
          aria-label={t("customerNamePlaceholder")}
        />
        <div className="flex flex-wrap gap-3">
          <Button size="touch">{tCommon("save")}</Button>
          <a
            href="/api/pdf"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ size: "touch", variant: "outline" }))}
          >
            <FileDown className="size-5" aria-hidden />
            {t("demoPdf")}
          </a>
        </div>
      </section>

      <RtlDemoCard title={t("rtlDemoTitle")} />
    </div>
  );
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
