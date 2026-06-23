/* Beispieldaten für den Kunden-Bereich (verbindliche Demodaten aus dem
   Design-Handoff „Kunden · Liste + Detail"). Eigennamen (Kunden, Leistungen)
   bleiben deutsch — sie stehen so auf dem Dokument. Beträge als ganzzahlige
   Cents; Einkaufspreis/Marge erscheinen hier bewusst nicht. */

import type { DocType } from "./dashboard-data";
import type { FlowCustomer } from "@/components/flow/NewCustomerModal";

export type CustomerDocStatus =
  | "bezahlt"
  | "offen"
  | "versendet"
  | "entwurf"
  | "angebot"
  | "angenommen";

export interface CustomerDoc {
  id: string;
  type: DocType;
  amount: number; // Cent
  status: CustomerDocStatus;
  date: string; // ISO (JJJJ-MM-TT)
  service: string;
}

export interface Customer {
  id: string;
  name: string;
  firma: boolean;
  initials: string;
  street: string;
  zip: string;
  city: string;
  ort: string;
  phone: string;
  email: string;
  kundennr: string;
  note: string;
  open: number; // offener Betrag in Cent
  docs: CustomerDoc[];
  /** Frisch über das „Neuer Kunde"-Modal angelegt → „neu angelegt"-Badge. */
  isNew?: boolean;
}

export const CUSTOMERS: Customer[] = [
  {
    id: "ks", name: "Familie Schneider", firma: false, initials: "FS",
    street: "Berger Straße 147", zip: "60385", city: "Frankfurt am Main", ort: "Frankfurt",
    phone: "069 123456", email: "schneider@email.de", kundennr: "KD-1042",
    note: "Zahlt immer sofort, bevorzugt Überweisung",
    open: 0,
    docs: [
      { id: "2026-0042", type: "rechnung", amount: 48000, status: "bezahlt", date: "2026-06-03", service: "Malerarbeiten Wandfläche" },
      { id: "2026-0031", type: "angebot", amount: 48000, status: "angenommen", date: "2026-05-28", service: "Malerarbeiten Wandfläche" },
    ],
  },
  {
    id: "km", name: "Müller GmbH", firma: true, initials: "MG",
    street: "Industriestraße 8", zip: "63065", city: "Offenbach am Main", ort: "Offenbach",
    phone: "069 887654", email: "kontakt@mueller-gmbh.de", kundennr: "KD-1037",
    note: "Rechnung per Post gewünscht",
    open: 124000,
    docs: [
      { id: "2026-0039", type: "rechnung", amount: 124000, status: "offen", date: "2026-05-20", service: "Fassadenanstrich Außen" },
      { id: "2026-0024", type: "rechnung", amount: 76000, status: "bezahlt", date: "2026-04-11", service: "Treppenhaus streichen" },
    ],
  },
  {
    id: "kk", name: "Bau König KG", firma: true, initials: "BK",
    street: "Rheinstraße 62", zip: "64283", city: "Darmstadt", ort: "Darmstadt",
    phone: "06151 33120", email: "info@bau-koenig.de", kundennr: "KD-1031",
    note: "Anfahrt: Hintereingang Hofseite",
    open: 0,
    docs: [
      { id: "2026-0028", type: "angebot", amount: 540000, status: "versendet", date: "2026-05-28", service: "Komplettanstrich Neubau" },
    ],
  },
  {
    id: "kd", name: "Ayşe Demir", firma: false, initials: "AD",
    street: "Nürnberger Straße 19", zip: "63450", city: "Hanau", ort: "Hanau",
    phone: "06181 290155", email: "a.demir@email.de", kundennr: "KD-1019",
    note: "",
    open: 0,
    docs: [
      { id: "2026-0017", type: "rechnung", amount: 69000, status: "bezahlt", date: "2026-05-15", service: "Lackierarbeiten Innentüren" },
    ],
  },
  {
    id: "kc", name: "Café Sonnenhof", firma: true, initials: "CS",
    street: "Marktplatz 4", zip: "61169", city: "Friedberg", ort: "Friedberg",
    phone: "06031 71400", email: "hallo@cafe-sonnenhof.de", kundennr: "KD-1008",
    note: "",
    open: 32000,
    docs: [
      { id: "2026-0011", type: "rechnung", amount: 32000, status: "offen", date: "2026-05-06", service: "Deckenanstrich Gastraum" },
    ],
  },
  {
    id: "kw", name: "Familie Weber", firma: false, initials: "FW",
    street: "Lindenweg 7", zip: "61348", city: "Bad Homburg", ort: "Bad Homburg",
    phone: "06172 88245", email: "weber.familie@email.de", kundennr: "KD-0994",
    note: "",
    open: 0,
    docs: [
      { id: "2026-0006", type: "angebot", amount: 148000, status: "entwurf", date: "2026-04-29", service: "Tapezieren Wohnzimmer" },
    ],
  },
];

/** Jüngstes Dokument eines Kunden (nach Datum) – `undefined`, wenn (noch) keins. */
export function lastDoc(customer: Customer): CustomerDoc | undefined {
  return [...customer.docs].sort((a, b) => b.date.localeCompare(a.date))[0];
}

/** Sortierschlüssel „Zuletzt": jüngstes Dokumentdatum; neue Kunden ohne
 *  Dokument wandern nach ganz oben, der Rest ganz nach unten. */
export function recentKey(customer: Customer): string {
  return lastDoc(customer)?.date ?? (customer.isNew ? "9999-99-99" : "0");
}

/** Wandelt einen im Modal angelegten Kunden in einen vollständigen Kunden um.
 *  Kundennummer wird fortlaufend ab KD-1043 vergeben; noch keine Dokumente. */
export function customerFromFlow(flow: FlowCustomer, seq: number): Customer {
  const cityName = flow.cityName ?? flow.city;
  return {
    id: flow.id,
    name: flow.name,
    firma: Boolean(flow.firma),
    initials: flow.initials,
    street: flow.street,
    zip: flow.zip ?? "",
    city: cityName,
    ort: cityName,
    phone: flow.phone ?? "",
    email: flow.email ?? "",
    kundennr: `KD-${1043 + seq}`,
    note: flow.note ?? "",
    open: 0,
    docs: [],
    isNew: true,
  };
}

/** Statusfarbe als CSS-Token (für den Punkt in der Liste). */
export const STATUS_COLOR: Record<CustomerDocStatus, string> = {
  bezahlt: "var(--ok)",
  offen: "var(--warn)",
  versendet: "var(--info)",
  entwurf: "var(--draft)",
  angebot: "var(--info)",
  angenommen: "var(--ok)",
};
