import { getTranslations } from "next-intl/server";
import { SidebarLangLink } from "./sidebar-lang-link";
import { SidebarNav } from "./sidebar-nav";
import { getSidebarData } from "@/lib/layout/sidebar-data";
import "./sidebar.css";

function toInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

interface SidebarProps {
  collapsed?: boolean;
}

/** Linke Navigationsleiste des Desktop-Dashboards (RTL-fest). */
export async function Sidebar({ collapsed = false }: SidebarProps) {
  const t = await getTranslations("Dashboard");
  const { company, customerCount, catalogCount } = await getSidebarData();

  const companyName = company.name;
  const ownerName = company.director;
  const initials = toInitials(companyName);

  return (
    <aside
      className={collapsed ? "dside dside--collapsed" : "dside"}
      data-collapsed={collapsed ? "true" : "false"}
      data-testid="app-sidebar"
    >
      <div className="dside-brand">
        <div className="dside-logo">{initials}</div>
        <div>
          <div className="dside-name">{companyName}</div>
        </div>
      </div>

      <SidebarNav
        customerCount={customerCount}
        catalogCount={catalogCount}
        menuLabel={t("menu")}
        collapsed={collapsed}
      />

      <div className="dside-foot">
        <SidebarLangLink />
        <div className="dside-user" title={collapsed ? ownerName : undefined}>
          <span className="dside-av">{initials}</span>
          <div className="dside-uname">{ownerName}</div>
        </div>
      </div>
    </aside>
  );
}
