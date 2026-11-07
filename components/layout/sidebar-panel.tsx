"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { sidebarCollapsedCookie } from "@/lib/layout/sidebar-preference";
import { SidebarLangLink } from "./sidebar-lang-link";
import { SidebarNav } from "./sidebar-nav";
import "./sidebar-panel.css";

interface SidebarPanelProps {
  companyName: string;
  ownerName: string;
  initials: string;
  customerCount: number;
  catalogCount: number;
  initialCollapsed: boolean;
  /** false: Umschalten gilt nur für diese Ansicht, die gespeicherte Wahl bleibt. */
  persist: boolean;
}

const STROKE = 1.75;

/** Linke Navigationsleiste (RTL-fest), per Button ein- und ausklappbar. */
export function SidebarPanel({
  companyName,
  ownerName,
  initials,
  customerCount,
  catalogCount,
  initialCollapsed,
  persist,
}: SidebarPanelProps) {
  const t = useTranslations("Dashboard");
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const toggleLabel = collapsed ? t("sidebarExpand") : t("sidebarCollapse");
  // In RTL spiegelt das CSS das Symbol – die Leiste liegt dort rechts.
  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose;

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    if (persist) document.cookie = sidebarCollapsedCookie(next);
  }

  return (
    <aside
      className={collapsed ? "dside dside--collapsed" : "dside"}
      data-collapsed={collapsed ? "true" : "false"}
      data-testid="app-sidebar"
    >
      <div className="dside-brand">
        <div className="dside-logo">{initials}</div>
        <div className="dside-name" title={companyName}>{companyName}</div>
        <button
          type="button"
          className="dside-toggle"
          aria-expanded={!collapsed}
          aria-label={toggleLabel}
          title={toggleLabel}
          onClick={toggle}
        >
          <ToggleIcon size={20} strokeWidth={STROKE} aria-hidden />
        </button>
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
