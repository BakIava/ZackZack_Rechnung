import {
  Building2,
  ClipboardList,
  History,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SidebarLangLink } from "./sidebar-lang-link";
import type { DashboardData } from "@/lib/dashboard/fetch";
import { createClient } from "@/lib/supabase/server";

type NavId = "dashboard" | "customers" | "catalog" | "history" | "settings";

interface NavEntry {
  id: NavId;
  href: string;
  icon: LucideIcon;
  labelKey: string;
  count?: number;
}

interface SidebarProps {
  /** Aktiver Navigationseintrag – `null` im geführten Flow (kein Menüpunkt aktiv). */
  active?: NavId | null;
  data?: DashboardData;
}

const STROKE = 1.75;

function toInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/** Linke Navigationsleiste des Desktop-Dashboards (RTL-fest). */
export async function Sidebar({ active, data }: SidebarProps) {
  const t = await getTranslations("Dashboard");

  // Wenn kein data übergeben wurde (customers, catalog, documents, settings),
  // minimal-Fetch direkt hier – RLS liefert automatisch die richtige Firma.
  let companyName = data?.companyName ?? "";
  let initials = data?.companyInitials ?? "";
  let ownerName = data?.director ?? "";

  if (!data) {
    const supabase = await createClient();
    const { data: co } = await supabase
      .from("companies")
      .select("name, director")
      .single();
    if (co) {
      companyName = co.name ?? "";
      initials = toInitials(companyName);
      ownerName = co.director ?? "";
    }
  }

  const nav: NavEntry[] = [
    { id: "dashboard", href: "/dashboard", icon: Building2, labelKey: "navDashboard" },
    { id: "customers", href: "/customers", icon: Users, labelKey: "navCustomers", count: data?.customerCount },
    { id: "catalog", href: "/catalog", icon: ClipboardList, labelKey: "navCatalog", count: data?.catalogCount },
    { id: "history", href: "/documents", icon: History, labelKey: "navDocuments" },
    { id: "settings", href: "/settings", icon: Settings, labelKey: "navSettings" },
  ];

  return (
    <aside className="dside">
      <div className="dside-brand">
        <div className="dside-logo">{initials}</div>
        <div>
          <div className="dside-name">{companyName}</div>
        </div>
      </div>

      <nav className="dnav" aria-label="Main">
        <div className="dnav-lbl">{t("menu")}</div>
        {nav.map(({ id, href, icon: Icon, labelKey, count }) => (
          <Link
            key={id}
            href={href}
            className="dnav-item"
            data-on={active === id ? "1" : "0"}
            aria-current={active === id ? "page" : undefined}
          >
            <Icon size={21} strokeWidth={STROKE} aria-hidden />
            <span>{t(labelKey)}</span>
            {count != null && count > 0 && <span className="dnav-count">{count}</span>}
          </Link>
        ))}
      </nav>

      <div className="dside-foot">
        <SidebarLangLink />
        <div className="dside-user">
          <span className="dside-av">{initials}</span>
          <div>
            <div className="dside-uname">{ownerName}</div>
            <div className="dside-urole">{t("kleinunternehmer")}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
