import { describe, expect, it } from "vitest";
import type { KatalogEintrag } from "@/types/service";
import { katalogToServiceInput, rowToKatalog } from "./mappers";

function eintrag(preisCents: number): KatalogEintrag {
  return {
    id: "svc-1",
    de: "Rabatt Stammkunde",
    uebersetzungen: { de: "Rabatt Stammkunde", tr: "", ar: "" },
    einheit: "Pauschale",
    preisCents,
    kategorie: "Sonstiges",
    verwendungen: 0,
  };
}

describe("Katalog-Mapper – Standardpreis", () => {
  it("speichert einen Abzug-Eintrag mit negativem Standardpreis", () => {
    expect(katalogToServiceInput(eintrag(-5_000)).default_price).toBe(-5_000);
  });

  it("speichert ohne Preis keinen Standardpreis", () => {
    expect(katalogToServiceInput(eintrag(0)).default_price).toBeNull();
  });

  it("liest einen negativen Standardpreis unverändert zurück", () => {
    expect(rowToKatalog({
      id: "svc-1",
      company_id: "company-1",
      description_de: "Rabatt Stammkunde",
      description_tr: null,
      description_ar: null,
      unit: "Pauschale",
      default_price: -5_000,
      starter_template_id: null,
      created_at: "2026-11-07T10:00:00Z",
      updated_at: "2026-11-07T10:00:00Z",
    }).preisCents).toBe(-5_000);
  });
});
