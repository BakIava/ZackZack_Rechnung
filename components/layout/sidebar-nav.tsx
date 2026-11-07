"use client";

import {
  Building2,
  ClipboardList,
  FilePlus2,
  History,
  Loader2,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useFormStatus } from "react-dom";
import { Link } from "@/i18n/navigation";
import { startNewDocument } from "@/lib/documents/draft-actions";
import { startNavigationTransition } from "@/lib/navigation-transition";
import "./sidebar-nav.css";

interface NavEntry {
  id: string;
  href: string;
  icon: LucideIcon;
  labelKey: string;
  count?: number;
}

interface SidebarNavProps {
  customerCount: number;
  catalogCount: number;
  menuLabel: string;
  collapsed?: boolean;
}

const STROKE = 1.75;

interface CreateInvoiceButtonProps {
  label: string;
  collapsed: boolean;
}

/**
 * „Rechnung erstellen": legt per Server-Action einen Entwurf an (wie „Neu erstellen").
 * Eigener Spinner statt Seitenwechsel-Overlay – führt die Weiterleitung auf die
 * aktuelle URL zurück (leerer Entwurf in Schritt 1), würde das Overlay hängen.
 */
function CreateInvoiceButton({ label, collapsed }: CreateInvoiceButtonProps) {
  const { pending } = useFormStatus();
  const Icon = pending ? Loader2 : FilePlus2;
  return (
    <button
      type="submit"
      className="dnav-item"
      disabled={pending}
      aria-busy={pending}
      aria-label={collapsed ? label : undefined}
      title={collapsed ? label : undefined}
    >
      <Icon size={21} strokeWidth={STROKE} className={pending ? "dnav-spin" : undefined} aria-hidden />
      <span>{label}</span>
    </button>
  );
}

export function SidebarNav({
  customerCount,
  catalogCount,
  menuLabel,
  collapsed = false,
}: SidebarNavProps) {
  const t = useTranslations("Dashboard");
  const pathname = usePathname();

  const [dashboard, ...entries]: NavEntry[] = [
    { id: "dashboard", href: "/dashboard", icon: Building2, labelKey: "navDashboard" },
    { id: "customers", href: "/customers", icon: Users, labelKey: "navCustomers", count: customerCount },
    { id: "catalog", href: "/catalog", icon: ClipboardList, labelKey: "navCatalog", count: catalogCount },
    { id: "history", href: "/documents", icon: History, labelKey: "navDocuments" },
  ];

  function renderLink({ id, href, icon: Icon, labelKey, count }: NavEntry) {
    const isActive = pathname.endsWith(href) || pathname.includes(href + "/");
    return (
      <Link
        key={id}
        href={href}
        className="dnav-item"
        data-on={isActive ? "1" : "0"}
        aria-current={isActive ? "page" : undefined}
        aria-label={collapsed ? t(labelKey) : undefined}
        title={collapsed ? t(labelKey) : undefined}
        onClick={() => {
          if (!isActive) startNavigationTransition();
        }}
      >
        <Icon size={21} strokeWidth={STROKE} aria-hidden />
        <span>{t(labelKey)}</span>
        {count != null && count > 0 && <span className="dnav-count">{count}</span>}
      </Link>
    );
  }

  return (
    <nav className="dnav" aria-label="Main">
      <div className="dnav-lbl">{menuLabel}</div>
      {renderLink(dashboard)}
      <form action={startNewDocument} className="contents">
        <CreateInvoiceButton label={t("navCreateInvoice")} collapsed={collapsed} />
      </form>
      {entries.map(renderLink)}
    </nav>
  );
}
