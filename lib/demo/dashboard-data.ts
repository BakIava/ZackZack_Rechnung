/* Beispieldaten fürs Dashboard (verbindliche Demodaten aus dem Design-Handoff).
   Eigennamen (Betrieb, Kunden, Leistungen) bleiben deutsch — sie stehen so auf
   dem Dokument. Beträge als ganzzahlige Cents. */

export type DocType = "rechnung" | "angebot";
export type DocStatus = "bezahlt" | "offen" | "versendet" | "entwurf";

export interface DashboardDoc {
  id: string;
  type: DocType;
  customer: string;
  service: string;
  amount: number; // Cent
  date: string; // ISO (JJJJ-MM-TT)
  status: DocStatus;
}

export const COMPANY = {
  name: "Yılmaz Malerbetrieb",
  owner: "Mehmet Yılmaz",
  initials: "YM",
  trade: "Maler & Lackierer",
} as const;

export const DOCS: DashboardDoc[] = [
  { id: "R-2026-041", type: "rechnung", customer: "Familie Schneider", service: "Malerarbeiten Wandfläche", amount: 48000, date: "2026-06-02", status: "bezahlt" },
  { id: "A-2026-088", type: "angebot", customer: "Bäckerei Krause GmbH", service: "Fassadenanstrich Außen", amount: 234000, date: "2026-05-30", status: "versendet" },
  { id: "R-2026-040", type: "rechnung", customer: "Ahmet Demir", service: "Lackierarbeiten Innentüren", amount: 69000, date: "2026-05-28", status: "offen" },
  { id: "A-2026-087", type: "angebot", customer: "Familie Wagner", service: "Tapezieren Wohnzimmer", amount: 112000, date: "2026-05-25", status: "entwurf" },
  { id: "R-2026-039", type: "rechnung", customer: "Café Sonne", service: "Deckenanstrich Gastraum", amount: 85000, date: "2026-05-22", status: "bezahlt" },
];

/** Sidebar-Zähler (Demowerte). */
export const CUSTOMER_COUNT = 7;
export const CATALOG_COUNT = 24;

const openDocs = DOCS.filter((d) => d.status === "offen" || d.status === "versendet");

/** Offene Beträge (offen + versendet) für den Überblick. */
export const OPEN_COUNT = openDocs.length;
export const OPEN_SUM = openDocs.reduce((sum, d) => sum + d.amount, 0);
/** Im Zeitraum bereits bezahlte Summe. */
export const PAID_SUM = DOCS.filter((d) => d.status === "bezahlt").reduce((sum, d) => sum + d.amount, 0);
