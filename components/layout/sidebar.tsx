import { cookies } from "next/headers";
import { getSidebarData } from "@/lib/layout/sidebar-data";
import {
  SIDEBAR_COLLAPSED_COOKIE,
  parseSidebarCollapsed,
} from "@/lib/layout/sidebar-preference";
import { SidebarPanel } from "./sidebar-panel";

function toInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

interface SidebarProps {
  /**
   * Startet eingeklappt (Erstell-Flow, Schritt 1–3: Platz für Formular und
   * A4-Vorschau). Umschalten gilt dann nur für diese Ansicht und ändert die
   * gespeicherte Wahl nicht.
   */
  startCollapsed?: boolean;
}

/** Linke Navigationsleiste: lädt Firmendaten und die gespeicherte Ein-/Ausklapp-Wahl. */
export async function Sidebar({ startCollapsed = false }: SidebarProps) {
  const [{ company, customerCount, catalogCount }, cookieStore] = await Promise.all([
    getSidebarData(),
    cookies(),
  ]);
  const storedCollapsed = parseSidebarCollapsed(cookieStore.get(SIDEBAR_COLLAPSED_COOKIE)?.value);

  return (
    <SidebarPanel
      companyName={company.name}
      ownerName={company.director}
      initials={toInitials(company.name)}
      customerCount={customerCount}
      catalogCount={catalogCount}
      initialCollapsed={startCollapsed || storedCollapsed}
      persist={!startCollapsed}
    />
  );
}
