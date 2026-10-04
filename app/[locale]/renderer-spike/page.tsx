import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { RendererSpikeLoader } from "@/components/renderer-spike/renderer-spike-loader";

interface RendererSpikePageProps {
  params: Promise<{ locale: string }>;
}

export const dynamic = "force-dynamic";

export default async function RendererSpikePage({ params }: RendererSpikePageProps) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { locale } = await params;
  setRequestLocale(locale);
  return <RendererSpikeLoader />;
}
