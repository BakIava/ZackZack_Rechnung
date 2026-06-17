import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

interface AppNavProps {
  className?: string;
}

const navItems = [
  { href: "/dashboard", key: "dashboard" as const },
  { href: "/documents", key: "documents" as const },
  { href: "/create/1", key: "create" as const },
  { href: "/customers", key: "customers" as const },
  { href: "/catalog", key: "catalog" as const },
  { href: "/settings", key: "settings" as const },
];

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
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="inline-flex min-h-12 items-center rounded-lg border border-border bg-background px-4 text-sm font-medium hover:bg-muted"
        >
          {t(item.key)}
        </Link>
      ))}
    </nav>
  );
}
