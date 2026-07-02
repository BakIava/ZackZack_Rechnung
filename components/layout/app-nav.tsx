import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { startNewDocument } from "@/lib/documents/draft-actions";

interface AppNavProps {
  className?: string;
}

const navItems = [
  { href: "/dashboard", key: "dashboard" as const },
  { href: "/documents", key: "documents" as const },
  { href: "/customers", key: "customers" as const },
  { href: "/catalog", key: "catalog" as const },
  { href: "/settings", key: "settings" as const },
];

const NAV_ITEM_CLASS =
  "inline-flex min-h-12 items-center rounded-lg border border-border bg-background px-4 text-sm font-medium hover:bg-muted";

export function AppNav({ className }: AppNavProps) {
  const t = useTranslations("Nav");

  return (
    <nav
      className={cn(
        "flex flex-wrap gap-2 border-b border-border pb-4",
        className,
      )}
      aria-label="Main"
    >
      <Link href="/dashboard" className={NAV_ITEM_CLASS}>
        {t("dashboard")}
      </Link>
      <Link href="/documents" className={NAV_ITEM_CLASS}>
        {t("documents")}
      </Link>
      {/* "Neu erstellen" legt einen Draft an (POST) statt zu einer festen URL zu linken. */}
      <form action={startNewDocument} className="contents">
        <button type="submit" className={NAV_ITEM_CLASS}>
          {t("create")}
        </button>
      </form>
      {navItems.slice(2).map((item) => (
        <Link key={item.href} href={item.href} className={NAV_ITEM_CLASS}>
          {t(item.key)}
        </Link>
      ))}
    </nav>
  );
}
