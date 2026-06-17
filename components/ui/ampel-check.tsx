import { Check, X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { AmpelItem } from "@/lib/legal/pflichtangaben";
import { istExportierbar } from "@/lib/legal/pflichtangaben";
import { cn } from "@/lib/utils";

interface AmpelCheckProps {
  items: AmpelItem[];
  className?: string;
}

/** Ampel-Block für den Pflichtangaben-Check vor dem Export. RTL-fest, i18n-getrieben. */
export function AmpelCheck({ items, className }: AmpelCheckProps) {
  const t = useTranslations("Ampel");
  const complete = istExportierbar(items);

  return (
    <section
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-border bg-card p-4",
        className,
      )}
      aria-label={t("title")}
    >
      <h2 className="text-base font-semibold">{t("title")}</h2>
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li key={item.key} className="flex items-center gap-3">
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full",
                item.ok
                  ? "bg-primary text-primary-foreground"
                  : "bg-destructive/15 text-destructive",
              )}
            >
              {item.ok ? (
                <Check className="size-4" aria-hidden />
              ) : (
                <X className="size-4" aria-hidden />
              )}
            </span>
            <span className="text-sm">{t(item.key)}</span>
          </li>
        ))}
      </ul>
      <p
        className={cn(
          "text-sm font-medium",
          complete ? "text-primary" : "text-muted-foreground",
        )}
      >
        {complete ? t("complete") : t("incomplete")}
      </p>
    </section>
  );
}
