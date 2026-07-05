import { DocType } from "@/shared/doc";

/* Beispieldaten fürs Dashboard (verbindliche Demodaten aus dem Design-Handoff).
   Eigennamen (Betrieb, Kunden, Leistungen) bleiben deutsch — sie stehen so auf
   dem Dokument. Beträge als ganzzahlige Cents. */
   
export type DocStatus = "bezahlt" | "offen" | "versendet" | "entwurf";

export interface DashboardDoc {
  id: string;
  type: DocType;
  customer: string;
  number: string;
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
  { id: "R-2026-041", type: "invoice", customer: "Familie Schneider", number: "R-2026-041", amount: 48000, date: "2026-06-02", status: "bezahlt" },
  { id: "A-2026-088", type: "offer", customer: "Bäckerei Krause GmbH", number: "A-2026-088", amount: 234000, date: "2026-05-30", status: "versendet" },
  { id: "R-2026-040", type: "invoice", customer: "Ahmet Demir", number: "R-2026-040", amount: 69000, date: "2026-05-28", status: "offen" },
  { id: "A-2026-087", type: "offer", customer: "Familie Wagner", number: "A-2026-087", amount: 112000, date: "2026-05-25", status: "entwurf" },
  { id: "R-2026-039", type: "invoice", customer: "Café Sonne", number: "R-2026-039", amount: 85000, date: "2026-05-22", status: "bezahlt" },
];

export interface DemoCustomer {
  id: string;
  name: string;
  street: string;
  city: string;
  initials: string;
}

/** Kundenstamm (verbindliche Demodaten für Schritt 1 – Kundenauswahl).
 *  Eigennamen bleiben deutsch – sie stehen so auf dem Dokument. */
export const CUSTOMERS: DemoCustomer[] = [
  { id: "k1", name: "Familie Schneider", street: "Lindenstraße 12", city: "70180 Stuttgart", initials: "FS" },
  { id: "k2", name: "Bäckerei Krause GmbH", street: "Hauptstraße 45", city: "70435 Stuttgart", initials: "BK" },
  { id: "k3", name: "Ahmet Demir", street: "Mörikestraße 8", city: "70178 Stuttgart", initials: "AD" },
  { id: "k4", name: "Familie Wagner", street: "Gartenweg 3", city: "70569 Stuttgart", initials: "FW" },
  { id: "k5", name: "Café Sonne", street: "Marktplatz 1", city: "70173 Stuttgart", initials: "CS" },
  { id: "k6", name: "Petra Klein", street: "Ulmenweg 22", city: "70771 Leinf.-Echterdingen", initials: "PK" },
  { id: "k7", name: "Restaurant Anatolia", street: "Königstraße 60", city: "70173 Stuttgart", initials: "RA" },
];

/** Sidebar-Zähler (Demowerte). */
export const CUSTOMER_COUNT = CUSTOMERS.length;
export const CATALOG_COUNT = 24;

const openDocs = DOCS.filter((d) => d.status === "offen" || d.status === "versendet");

/** Offene Beträge (offen + versendet) für den Überblick. */
export const OPEN_COUNT = openDocs.length;
export const OPEN_SUM = openDocs.reduce((sum, d) => sum + d.amount, 0);
/** Im Zeitraum bereits bezahlte Summe. */
export const PAID_SUM = DOCS.filter((d) => d.status === "bezahlt").reduce((sum, d) => sum + d.amount, 0);
