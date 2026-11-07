/**
 * Ein-/Ausklapp-Wahl der Sidebar, pro Browser als Cookie gespeichert. Der
 * Server liest es beim Rendern, damit die Sidebar ab dem ersten Bild im
 * richtigen Zustand erscheint (kein Springen beim Laden).
 */
export const SIDEBAR_COLLAPSED_COOKIE = "zz-sidebar-collapsed";

const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;

/** Ohne gültige Wahl bleibt die Sidebar ausgeklappt (Standard). */
export function parseSidebarCollapsed(value: string | undefined): boolean {
  return value === "1";
}

/** Zuweisung für `document.cookie`. */
export function sidebarCollapsedCookie(collapsed: boolean): string {
  return `${SIDEBAR_COLLAPSED_COOKIE}=${collapsed ? "1" : "0"}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;
}
