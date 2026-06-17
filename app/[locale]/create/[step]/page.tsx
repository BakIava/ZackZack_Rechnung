import { getTranslations, setRequestLocale } from "next-intl/server";
import { AppNav } from "@/components/layout/app-nav";
import { PlaceholderScreen } from "@/components/layout/placeholder-screen";
import { StepHeader } from "@/components/ui";
import { routing } from "@/i18n/routing";

const TOTAL_STEPS = 3;

interface CreateStepPageProps {
  params: Promise<{ locale: string; step: string }>;
}

export default async function CreateStepPage({ params }: CreateStepPageProps) {
  const { locale, step } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("Create");
  const current = Math.min(Math.max(Number(step) || 1, 1), TOTAL_STEPS);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <AppNav />
      <StepHeader step={current} total={TOTAL_STEPS} title={t("title")} />
      <PlaceholderScreen titleKey="create" />
    </div>
  );
}

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    ["1", "2", "3"].map((step) => ({ locale, step })),
  );
}
