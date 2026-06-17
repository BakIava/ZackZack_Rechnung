import { getTranslations } from "next-intl/server";

export async function PlaceholderScreen({
  titleKey,
}: {
  titleKey: "dashboard" | "documents" | "create" | "customers" | "catalog" | "settings";
}) {
  const tNav = await getTranslations("Nav");
  const tPlaceholder = await getTranslations("Placeholder");

  return (
    <section className="mx-auto flex max-w-lg flex-col gap-4 py-8">
      <h1 className="text-2xl font-bold">{tNav(titleKey)}</h1>
      <p className="text-muted-foreground">{tPlaceholder("comingSoon")}</p>
    </section>
  );
}
