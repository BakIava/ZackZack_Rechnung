"use client";

import { Globe } from "lucide-react";
import NextLink from "next/link";
import { usePathname } from "@/i18n/navigation";
import "./sidebar-lang-link.css";

/** Sprach-Link in der Sidebar.
 *  Führt zur lokalefreien Route /language (außerhalb von [locale]) und merkt
 *  sich den aktuellen Pfad als `return`, damit man nach der Wahl auf die Seite
 *  zurückkommt, von der man gekommen ist. */
export function SidebarLangLink() {
  // usePathname (next-intl) liefert den Pfad OHNE Locale-Präfix, z. B. /dashboard.
  const pathname = usePathname();
  const href = `/language?return=${encodeURIComponent(pathname)}`;

  return (
    <div className="dside-lang-container">
      <NextLink
        href={href}
        className="dside-lang"
        title="Sprache wählen · Dil seç · اختر اللغة"
        aria-label="Sprache wählen · Dil seç · اختر اللغة"
      >
        <Globe size={18} strokeWidth={1.75} aria-hidden />
        <span className="dside-lang-txt">
          <b>Sprache</b>
          <i>·</i>
          <b>Dil</b>
          <i>·</i>
          <b lang="ar" dir="rtl">
            اللغة
          </b>
        </span>
      </NextLink>
    </div>
  );
}
