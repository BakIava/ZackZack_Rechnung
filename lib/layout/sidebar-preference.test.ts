import { describe, expect, it } from "vitest";
import {
  SIDEBAR_COLLAPSED_COOKIE,
  parseSidebarCollapsed,
  sidebarCollapsedCookie,
} from "./sidebar-preference";

describe("Sidebar-Präferenz", () => {
  it("klappt nur bei ausdrücklich gespeicherter Wahl ein", () => {
    expect(parseSidebarCollapsed("1")).toBe(true);
    expect(parseSidebarCollapsed("0")).toBe(false);
    expect(parseSidebarCollapsed(undefined)).toBe(false);
    expect(parseSidebarCollapsed("true")).toBe(false);
    expect(parseSidebarCollapsed("")).toBe(false);
  });

  it("speichert die Wahl app-weit für ein Jahr", () => {
    expect(sidebarCollapsedCookie(true)).toBe(
      `${SIDEBAR_COLLAPSED_COOKIE}=1; path=/; max-age=31536000; samesite=lax`,
    );
    expect(sidebarCollapsedCookie(false)).toMatch(new RegExp(`^${SIDEBAR_COLLAPSED_COOKIE}=0;`));
  });

  it("liest zurück, was es schreibt", () => {
    for (const collapsed of [true, false]) {
      const value = sidebarCollapsedCookie(collapsed).split(";")[0].split("=")[1];
      expect(parseSidebarCollapsed(value)).toBe(collapsed);
    }
  });
});
