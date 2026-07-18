"use client";

import {
  Building2,
  ClipboardList,
  History,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { Link } from "@/i18n/navigation";
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
}

const STROKE = 1.75;

export function SidebarNav({ customerCount, catalogCount, menuLabel }: SidebarNavProps) {
  const t = useTranslations("Dashboard");
  const pathname = usePathname();

  const nav: NavEntry[] = [
    { id: "dashboard", href: "/dashboard", icon: Building2, labelKey: "navDashboard" },
    { id: "customers", href: "/customers", icon: Users, labelKey: "navCustomers", count: customerCount },
    { id: "catalog", href: "/catalog", icon: ClipboardList, labelKey: "navCatalog", count: catalogCount },
    { id: "history", href: "/documents", icon: History, labelKey: "navDocuments" },
    { id: "settings", href: "/settings", icon: Settings, labelKey: "navSettings" },
  ];

  return (
    <nav className="dnav" aria-label="Main">
      <div className="dnav-lbl">{menuLabel}</div>
      {nav.map(({ id, href, icon: Icon, labelKey, count }) => {
        const isActive = pathname.endsWith(href) || pathname.includes(href + "/");
        return (
          <Link
            key={id}
            href={href}
            className="dnav-item"
            data-on={isActive ? "1" : "0"}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon size={21} strokeWidth={STROKE} aria-hidden />
            <span>{t(labelKey)}</span>
            {count != null && count > 0 && <span className="dnav-count">{count}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
