import { setRequestLocale } from "next-intl/server";
import { createDraftDocument } from "@/lib/flow/actions";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export default async function FlowNewPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  await createDraftDocument(locale);
}
