/* Beispieldaten für den Flow Schritt 2 (verbindliche Demodaten aus dem
   Design-Handoff). Eigennamen (Kunde, Leistungen) bleiben deutsch — sie stehen
   so auf dem Dokument. Beträge als ganzzahlige Cents. */

import type { KatalogEintrag } from "@/lib/katalog/types";
import type { Position } from "@/lib/flow/positionen";

/** Mehrsprachiger Leistungskatalog für den Katalog-Picker. */
export const FLOW_CATALOG: KatalogEintrag[] = [
  { id: "c1", de: "Malerarbeiten Wandfläche", uebersetzungen: { de: "Malerarbeiten Wandfläche", tr: "Duvar boyama", ar: "طلاء الجدران" }, einheit: "m²", preisCents: 1200, kategorie: "Wand & Decke", verwendungen: 12 },
  { id: "c2", de: "Tapete entfernen", uebersetzungen: { de: "Tapete entfernen", tr: "Duvar kağıdı sökme", ar: "إزالة ورق الجدران" }, einheit: "m²", preisCents: 450, kategorie: "Vorbereitung", verwendungen: 8 },
  { id: "c3", de: "Deckenanstrich", uebersetzungen: { de: "Deckenanstrich", tr: "Tavan boyama", ar: "طلاء السقف" }, einheit: "m²", preisCents: 1000, kategorie: "Wand & Decke", verwendungen: 9 },
  { id: "c4", de: "Tapezieren", uebersetzungen: { de: "Tapezieren", tr: "Duvar kağıdı kaplama", ar: "تركيب ورق الجدران" }, einheit: "m²", preisCents: 1400, kategorie: "Wand & Decke", verwendungen: 6 },
  { id: "c5", de: "Fassadenanstrich", uebersetzungen: { de: "Fassadenanstrich", tr: "Cephe boyama", ar: "طلاء الواجهة" }, einheit: "m²", preisCents: 2800, kategorie: "Fassade", verwendungen: 4 },
  { id: "c6", de: "Lackierarbeiten Türen", uebersetzungen: { de: "Lackierarbeiten Türen", tr: "Kapı lake / boya", ar: "طلاء الأبواب" }, einheit: "Stk.", preisCents: 9500, kategorie: "Lackierung", verwendungen: 7 },
  { id: "c7", de: "Grundierung auftragen", uebersetzungen: { de: "Grundierung auftragen", tr: "Astar sürme", ar: "طبقة أساس" }, einheit: "m²", preisCents: 650, kategorie: "Vorbereitung", verwendungen: 11 },
  { id: "c8", de: "Spachtelarbeiten", uebersetzungen: { de: "Spachtelarbeiten", tr: "Macunlama", ar: "أعمال المعجون" }, einheit: "m²", preisCents: 800, kategorie: "Vorbereitung", verwendungen: 5 },
];

/** Auswählbare Einheiten für freie Positionen. */
export const FLOW_UNITS = ["m²", "Std.", "Stk.", "lfm", "Pauschal", "kg", "Liter"];

/** Aus Schritt 1 übernommener Kunde (Demo). */
export const SAMPLE_CUSTOMER = { name: "Familie Schneider", initials: "FS" };

/** Vorbelegte Beispiel-Positionen. */
export function defaultPositions(): Position[] {
  return [
    { id: "p1", kind: "normal", label: "Malerarbeiten Wandfläche", uebersetzungen: { de: "Malerarbeiten Wandfläche", tr: "Duvar boyama", ar: "طلاء الجدران" }, qty: 45, unit: "m²", preisCents: 1200 },
    { id: "p2", kind: "normal", label: "Tapete entfernen", uebersetzungen: { de: "Tapete entfernen", tr: "Duvar kağıdı sökme", ar: "إزالة ورق الجدران" }, qty: 30, unit: "m²", preisCents: 450 },
    { id: "p3", kind: "fremd", label: "Gerüststellung", unit: "Pauschal", einkaufCents: 20000, aufschlagPct: 25, verkaufCents: 25000 },
  ];
}
