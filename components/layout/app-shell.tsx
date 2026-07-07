"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import "./app-shell.css";

interface AppShellProps {
  dir: "ltr" | "rtl";
  fontClasses: string;
  children: ReactNode;
}

function resolvePageClass(pathname: string): string {
  if (pathname.includes("/customers")) return "zz-cust";
  if (pathname.includes("/catalog")) return "zz-catalog";
  if (pathname.includes("/settings")) return "zz-settings";
  return "zz-dash";
}

/**
 * Client-seitige Shell: setzt die seitenspezifische CSS-Scope-Klasse
 * anhand der aktuellen Route, ohne die Sidebar neu zu laden.
 */
export function AppShell({ dir, fontClasses, children }: AppShellProps) {
  const pathname = usePathname();
  const pageClass = resolvePageClass(pathname);

  return (
    <div className={`${fontClasses} ${pageClass}`}>
      <div className="dapp" dir={dir}>
        {children}
      </div>
    </div>
  );
}
