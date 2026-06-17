import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";

interface LangSwitchProps {
  className?: string;
}

const LABELS: Record<string, string> = {
  de: "DE",
  tr: "TR",
  ar: "AR",
};

/** Sprachumschalter DE/TR/AR. RTL-fest, bleibt auf der aktuellen Route. */
export function LangSwitch({ className }: LangSwitchProps) {
  return (
    <div className={cn("flex gap-2", className)} role="group" aria-label="Language">
      {routing.locales.map((locale) => (
        <Link
          key={locale}
          href="/"
          locale={locale}
          className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-lg border border-border px-3 text-sm font-semibold hover:bg-muted"
        >
          {LABELS[locale] ?? locale.toUpperCase()}
        </Link>
      ))}
    </div>
  );
}
