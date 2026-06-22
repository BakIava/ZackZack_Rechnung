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
import {
  CATALOG_COUNT,
  COMPANY,
  CUSTOMER_COUNT,
  DOCS,
} from "@/lib/demo/dashboard-data";
import { SidebarLangLink } from "./sidebar-lang-link";

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
}

const NAV: NavEntry[] = [
  { id: "dashboard", href: "/dashboard", icon: Building2, labelKey: "navDashboard" },
  { id: "customers", href: "/customers", icon: Users, labelKey: "navCustomers", count: CUSTOMER_COUNT },
  { id: "catalog", href: "/catalog", icon: ClipboardList, labelKey: "navCatalog", count: CATALOG_COUNT },
  { id: "history", href: "/documents", icon: History, labelKey: "navDocuments", count: DOCS.length },
  { id: "settings", href: "/settings", icon: Settings, labelKey: "navSettings" },
];

const STROKE = 1.75;

/** Linke Navigationsleiste des Desktop-Dashboards (RTL-fest). */
export async function Sidebar({ active }: SidebarProps) {
  const t = await getTranslations("Dashboard");

  return (
    <aside className="dside">
      <div className="dside-brand">
        <div className="dside-logo">{COMPANY.initials}</div>
        <div>
          <div className="dside-name">{COMPANY.name}</div>
          <div className="dside-trade">{COMPANY.trade}</div>
        </div>
      </div>

      <nav className="dnav" aria-label="Main">
        <div className="dnav-lbl">{t("menu")}</div>
        {NAV.map(({ id, href, icon: Icon, labelKey, count }) => (
          <Link
            key={id}
            href={href}
            className="dnav-item"
            data-on={active === id ? "1" : "0"}
            aria-current={active === id ? "page" : undefined}
          >
            <Icon size={21} strokeWidth={STROKE} aria-hidden />
            <span>{t(labelKey)}</span>
            {count != null && <span className="dnav-count">{count}</span>}
          </Link>
        ))}
      </nav>

      <div className="dside-foot">
        <SidebarLangLink />
        <div className="dside-user">
          <span className="dside-av">{COMPANY.initials}</span>
          <div>
            <div className="dside-uname">{COMPANY.owner}</div>
            <div className="dside-urole">{t("kleinunternehmer")}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
