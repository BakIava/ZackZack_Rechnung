import { ArrowLeft, FileText } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import "./rtl-demo-card.css";

interface RtlDemoCardProps {
  title: string;
  className?: string;
}

/**
 * Demonstrates RTL-safe layout using Tailwind logical properties only
 * (ps-/pe-/ms-/me-/start-/end- – never pl-/pr-/ml-/mr-/left-/right-).
 * Co-located CSS handles the direction-aware accent via [dir="rtl"].
 */
export function RtlDemoCard({ title, className }: RtlDemoCardProps) {
  const t = useTranslations("Demo");
  const tCommon = useTranslations("Common");

  return (
    <article className={cn("rtl-demo-card", className)}>
      <div className="flex items-center gap-3 border-b border-border pb-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <FileText className="size-5" aria-hidden />
        </span>
        <h3 className="text-start text-base font-semibold">{title}</h3>
      </div>

      <p className="mt-3 text-start text-sm text-muted-foreground">
        {t("rtlHint")}
      </p>

      <div className="mt-4 flex items-center justify-between gap-2">
        <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
          {t("spacingBadge")}
        </span>
        <button
          type="button"
          className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-secondary px-4 text-sm font-medium text-secondary-foreground"
        >
          <ArrowLeft className="rtl-demo-card__back-icon size-4" aria-hidden />
          <span>{tCommon("back")}</span>
        </button>
      </div>
    </article>
  );
}
