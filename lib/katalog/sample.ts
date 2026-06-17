import type { KatalogEintrag } from "@/lib/katalog/types";

/** Echte Beispieldaten statt Platzhalter (Malerbetrieb). */
export const sampleKatalog: KatalogEintrag[] = [
  {
    id: "malerarbeiten-wandflaeche",
    de: "Malerarbeiten Wandfläche",
    uebersetzungen: {
      de: "Malerarbeiten Wandfläche",
      tr: "Duvar boyama",
      ar: "دهان الجدران",
    },
    einheit: "m²",
    preisCents: 1200,
  },
  {
    id: "grundierung",
    de: "Grundierung auftragen",
    uebersetzungen: {
      de: "Grundierung auftragen",
      tr: "Astar uygulama",
      ar: "وضع الطبقة الأساسية",
    },
    einheit: "m²",
    preisCents: 450,
  },
];
