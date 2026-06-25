/* Erweiterte Dokumentdaten für die Dokumente-Seite (Design-Handoff).
   Beträge als ganzzahlige Cents. Dokumentsprache immer Deutsch.
   Einkaufspreise/Margen erscheinen hier nicht — nur Verkaufspreise. */

import { type DocType, type DocStatus } from "./dashboard-data";

export type { DocType, DocStatus };

export interface DocPosition {
  label: string;
  qty: number;
  unit: string;
  priceEur: number; // Euro (float) — nur für Anzeige, nicht für Persistenz
}

export interface Document {
  id: string;
  type: DocType;
  customer: string;
  service: string;
  date: string; // ISO
  due?: string; // ISO — Rechnungen
  paidOn?: string; // ISO — bezahlte Rechnungen
  valid?: string; // ISO — Angebote
  status: DocStatus;
  positions: DocPosition[];
}

export function docTotalEur(doc: Document): number {
  return doc.positions.reduce((s, p) => s + p.qty * p.priceEur, 0);
}

export function isOverdue(doc: Document, today = "2026-06-24"): boolean {
  return (
    doc.type === "rechnung" &&
    doc.status === "offen" &&
    !!doc.due &&
    doc.due < today
  );
}

export const DOCUMENTS: Document[] = [
  {
    id: "R-2026-041",
    type: "rechnung",
    customer: "Familie Schneider",
    service: "Malerarbeiten Wohnung",
    date: "2026-06-02",
    due: "2026-06-16",
    paidOn: "2026-06-09",
    status: "bezahlt",
    positions: [
      { label: "Malerarbeiten Wandfläche", qty: 32, unit: "m²", priceEur: 12.5 },
      { label: "Materialpauschale", qty: 1, unit: "Pauschal", priceEur: 80 },
    ],
  },
  {
    id: "A-2026-088",
    type: "angebot",
    customer: "Bäckerei Krause GmbH",
    service: "Fassadenanstrich Außen",
    date: "2026-05-30",
    valid: "2026-06-27",
    status: "versendet",
    positions: [
      { label: "Fassadenanstrich", qty: 78, unit: "m²", priceEur: 28 },
      { label: "Gerüststellung", qty: 1, unit: "Pauschal", priceEur: 160 },
    ],
  },
  {
    id: "R-2026-040",
    type: "rechnung",
    customer: "Ahmet Demir",
    service: "Lackierarbeiten Innentüren",
    date: "2026-05-28",
    due: "2026-06-11",
    status: "offen",
    positions: [
      { label: "Lackierarbeiten Türen", qty: 6, unit: "Stk.", priceEur: 95 },
      { label: "Grundierung auftragen", qty: 18, unit: "m²", priceEur: 6.5 },
    ],
  },
  {
    id: "A-2026-087",
    type: "angebot",
    customer: "Familie Wagner",
    service: "Tapezieren Wohnzimmer",
    date: "2026-05-25",
    valid: "2026-06-22",
    status: "entwurf",
    positions: [
      { label: "Tapezieren", qty: 46, unit: "m²", priceEur: 14 },
      { label: "Tapete entfernen", qty: 46, unit: "m²", priceEur: 4.5 },
    ],
  },
  {
    id: "R-2026-039",
    type: "rechnung",
    customer: "Café Sonne",
    service: "Deckenanstrich Gastraum",
    date: "2026-05-22",
    due: "2026-06-05",
    paidOn: "2026-05-30",
    status: "bezahlt",
    positions: [
      { label: "Deckenanstrich", qty: 64, unit: "m²", priceEur: 10 },
      { label: "Spachtelarbeiten", qty: 26, unit: "m²", priceEur: 8 },
    ],
  },
  {
    id: "R-2026-038",
    type: "rechnung",
    customer: "Petra Klein",
    service: "Treppenhaus streichen",
    date: "2026-05-12",
    due: "2026-05-26",
    status: "offen",
    positions: [
      { label: "Treppenhaus streichen", qty: 1, unit: "Pauschal", priceEur: 380 },
      { label: "Fußleisten lackieren", qty: 24, unit: "lfm", priceEur: 7.5 },
    ],
  },
  {
    id: "A-2026-086",
    type: "angebot",
    customer: "Restaurant Anatolia",
    service: "Komplettrenovierung Gastraum",
    date: "2026-05-08",
    valid: "2026-06-05",
    status: "versendet",
    positions: [
      { label: "Malerarbeiten Wandfläche", qty: 140, unit: "m²", priceEur: 12 },
      { label: "Deckenanstrich", qty: 95, unit: "m²", priceEur: 10 },
      { label: "Materialpauschale", qty: 1, unit: "Pauschal", priceEur: 240 },
    ],
  },
  {
    id: "R-2026-037",
    type: "rechnung",
    customer: "Familie Schneider",
    service: "Grundierung & Anstrich Flur",
    date: "2026-05-04",
    due: "2026-05-18",
    paidOn: "2026-05-14",
    status: "bezahlt",
    positions: [
      { label: "Grundierung auftragen", qty: 38, unit: "m²", priceEur: 6.5 },
      { label: "Malerarbeiten Wandfläche", qty: 38, unit: "m²", priceEur: 12 },
    ],
  },
  {
    id: "R-2026-036",
    type: "rechnung",
    customer: "Bäckerei Krause GmbH",
    service: "Verkaufsraum streichen",
    date: "2026-04-26",
    due: "2026-05-10",
    paidOn: "2026-05-02",
    status: "bezahlt",
    positions: [
      { label: "Malerarbeiten Wandfläche", qty: 120, unit: "m²", priceEur: 12 },
      { label: "Lackierarbeiten Türen", qty: 8, unit: "Stk.", priceEur: 95 },
    ],
  },
  {
    id: "A-2026-085",
    type: "angebot",
    customer: "Ahmet Demir",
    service: "Balkon & Geländer lackieren",
    date: "2026-04-20",
    valid: "2026-05-18",
    status: "entwurf",
    positions: [
      { label: "Lackierarbeiten Geländer", qty: 1, unit: "Pauschal", priceEur: 560 },
      { label: "Grundierung auftragen", qty: 22, unit: "m²", priceEur: 6.5 },
    ],
  },
  {
    id: "R-2026-035",
    type: "rechnung",
    customer: "Café Sonne",
    service: "Ausbesserung Schaufenster",
    date: "2026-04-14",
    due: "2026-04-28",
    paidOn: "2026-04-22",
    status: "bezahlt",
    positions: [
      { label: "Putzausbesserung", qty: 12, unit: "m²", priceEur: 18 },
      { label: "Malerarbeiten Wandfläche", qty: 14, unit: "m²", priceEur: 12 },
    ],
  },
  {
    id: "R-2026-034",
    type: "rechnung",
    customer: "Familie Wagner",
    service: "Kinderzimmer streichen",
    date: "2026-04-06",
    due: "2026-04-20",
    paidOn: "2026-04-17",
    status: "bezahlt",
    positions: [
      { label: "Malerarbeiten Wandfläche", qty: 54, unit: "m²", priceEur: 12 },
      { label: "Deckenanstrich", qty: 18, unit: "m²", priceEur: 10 },
    ],
  },
];
