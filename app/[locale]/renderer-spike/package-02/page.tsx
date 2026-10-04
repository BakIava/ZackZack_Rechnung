import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Package02RendererLoader } from "@/components/renderer-spike/package-02-renderer-loader";

interface Package02RendererPageProps {
  params: Promise<{ locale: string }>;
}

export const dynamic = "force-dynamic";

export default async function Package02RendererPage({ params }: Package02RendererPageProps) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { locale } = await params;
  setRequestLocale(locale);
  return <Package02RendererLoader />;
}
