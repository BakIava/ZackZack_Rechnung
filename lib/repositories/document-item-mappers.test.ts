import { describe, expect, it } from "vitest";
import { toDocumentItem, toDraftItem } from "./document-item-mappers";

const longDescription = "Vorbereitung und Ausführung\n" + "Details ".repeat(2000);
const row = {
  id: "item-1",
  service_id: null,
  position: 1,
  description_de: "Innenanstrich",
  additional_description_de: longDescription,
  amount: 2,
  unit: "m²",
  unit_price: 1_000,
  total_amount: 2_000,
  tax_rate: 0,
  tax_rate_overridden: false,
  tax_amount: 0,
  gross_amount: 2_000,
  purchase_price: 700,
  surcharge: 300,
  surcharge_type: "fixed",
};

describe("document item projections", () => {
  it("übernimmt mehrzeilige Beschreibungen vollständig in die Dokumentansicht", () => {
    const item = toDocumentItem(row);

    expect(item.additionalDescriptionDe).toBe(longDescription);
    expect(item).not.toHaveProperty("purchasePrice");
    expect(item).not.toHaveProperty("surcharge");
    expect(item).not.toHaveProperty("surchargeType");
  });

  it("übernimmt die Beschreibung in den Draft mit internen Feldern", () => {
    const item = toDraftItem(row);

    expect(item.additionalDescriptionDe).toBe(longDescription);
    expect(item.purchasePrice).toBe(700);
    expect(item.surcharge).toBe(300);
  });

  it("belässt historische Positionen ohne Beschreibung bei null", () => {
    expect(toDocumentItem({ ...row, additional_description_de: null }).additionalDescriptionDe).toBeNull();
    expect(toDraftItem({ ...row, additional_description_de: null }).additionalDescriptionDe).toBeNull();
  });
});
