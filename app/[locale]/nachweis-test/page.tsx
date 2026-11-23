import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { PositionBulkTestHarness } from "@/components/nachweis-test/position-bulk-test-harness";
import { NachweisTestHarness } from "@/components/nachweis-test/nachweis-test-harness";
import { TextImproveTestHarness } from "@/components/nachweis-test/text-improve-test-harness";
import { routing } from "@/i18n/routing";

interface NachweisTestPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ import?: string; view?: string; failure?: string }>;
}

export const dynamic = "force-dynamic";

export default async function NachweisTestPage({ params, searchParams }: NachweisTestPageProps) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const { import: mode, view, failure } = await searchParams;
  if (view === "position-selection") return <PositionBulkTestHarness locale={locale} failOnce={failure === "once"} />;
  if (view === "text-improve") return <TextImproveTestHarness locale={locale} />;
  return <NachweisTestHarness locale={locale} importMode={mode === "fail-once" || mode === "unknown" ? mode : null} />;
}
