import type { KatalogEintrag, ServiceRow } from "@/types/service";

export function rowToKatalog(row: ServiceRow): KatalogEintrag {
  return {
    id: row.id,
    de: row.description_de,
    uebersetzungen: {
      de: row.description_de,
      tr: row.description_tr ?? "",
      ar: row.description_ar ?? "",
    },
    einheit: row.unit ?? "",
    preisCents: row.default_price ?? 0,
    kategorie: "Sonstiges",
    verwendungen: 0,
  };
}

export function katalogToServiceInput(entry: KatalogEintrag): {
  description_de: string;
  description_tr: string | null;
  description_ar: string | null;
  unit: string | null;
  default_price: number | null;
} {
  return {
    description_de: entry.de.trim(),
    description_tr: entry.uebersetzungen.tr?.trim() || null,
    description_ar: entry.uebersetzungen.ar?.trim() || null,
    unit: entry.einheit?.trim() || null,
    default_price: entry.preisCents > 0 ? entry.preisCents : null,
  };
}
