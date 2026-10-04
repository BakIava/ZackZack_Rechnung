import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DraftItem } from "@/types/document";

const h = vi.hoisted(() => ({
  getCurrentCompanyId: vi.fn(),
  isDraftDocument: vi.fn(),
  getItemPricing: vi.fn(),
  getDraftItems: vi.fn(),
  updateDocumentItem: vi.fn(),
  getDraftTaxConfig: vi.fn(),
  setDraftDocumentTotals: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: h.revalidatePath }));
vi.mock("@/lib/supabase/auth", () => ({ getCurrentCompanyId: h.getCurrentCompanyId }));
vi.mock("@/lib/repositories/document-drafts", () => ({
  isDraftDocument: h.isDraftDocument,
  getDraftTaxConfig: h.getDraftTaxConfig,
  setDraftDocumentTotals: h.setDraftDocumentTotals,
}));
vi.mock("@/lib/repositories/document-items", () => ({
  getItemPricing: h.getItemPricing,
  getDraftItems: h.getDraftItems,
  updateDocumentItem: h.updateDocumentItem,
}));

import { updateItem } from "./item-actions";

const item: DraftItem = {
  id: "item-1",
  serviceId: "service-1",
  position: 1,
  descriptionDe: "Innenanstrich",
  additionalDescriptionDe: null,
  amount: 2,
  unit: "m²",
  unitPrice: 10_000,
  totalAmount: 20_000,
  taxRate: 0,
  taxRateOverridden: false,
  taxAmount: 0,
  grossAmount: 20_000,
  purchasePrice: null,
  surcharge: null,
  surchargeType: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  h.getCurrentCompanyId.mockResolvedValue("company-1");
  h.isDraftDocument.mockResolvedValue(true);
  h.getItemPricing.mockResolvedValue({
    documentId: "document-1",
    amount: item.amount,
    unitPrice: item.unitPrice,
    purchasePrice: null,
    surcharge: null,
    surchargeType: null,
    taxRate: 0,
    taxRateOverridden: false,
  });
  h.getDraftItems.mockResolvedValue([item]);
  h.updateDocumentItem.mockResolvedValue({});
});

describe("updateItem additionalDescriptionDe", () => {
  it("speichert eine mehrzeilige Beschreibung ohne Preis- oder Steuerupdate", async () => {
    const description = "Wände vorbereiten\nZweimal streichen\n" + "Detail ".repeat(2000);
    h.getDraftItems.mockResolvedValue([{ ...item, additionalDescriptionDe: description }]);

    const result = await updateItem(item.id, { additionalDescriptionDe: description });

    expect(h.updateDocumentItem).toHaveBeenCalledWith("company-1", item.id, {
      additional_description_de: description,
    });
    expect(h.setDraftDocumentTotals).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      items: [{ descriptionDe: "Innenanstrich", additionalDescriptionDe: description }],
      totals: { netAmount: 20_000, taxAmount: 0, grossAmount: 20_000 },
    });
  });

  it.each([
    { origin: "Katalog", serviceId: "service-1", purchasePrice: null },
    { origin: "frei", serviceId: null, purchasePrice: null },
    { origin: "Fremdleistung", serviceId: null, purchasePrice: 15_000 },
  ])("setzt die Beschreibung bei $origin nach dem Anlegen", async ({ serviceId, purchasePrice }) => {
    h.getItemPricing.mockResolvedValue({
      documentId: "document-1",
      amount: item.amount,
      unitPrice: item.unitPrice,
      purchasePrice,
      surcharge: purchasePrice === null ? null : 5_000,
      surchargeType: purchasePrice === null ? null : "fixed",
      taxRate: 0,
      taxRateOverridden: false,
    });
    h.getDraftItems.mockResolvedValue([{
      ...item,
      serviceId,
      purchasePrice,
      surcharge: purchasePrice === null ? null : 5_000,
      surchargeType: purchasePrice === null ? null : "fixed",
      additionalDescriptionDe: "Details",
    }]);

    await updateItem(item.id, { additionalDescriptionDe: "Details" });

    expect(h.updateDocumentItem).toHaveBeenCalledWith("company-1", item.id, {
      additional_description_de: "Details",
    });
  });

  it.each(["", "  \n\t  ", null])("entfernt leeren Beschreibungstext (%s)", async (value) => {
    await updateItem(item.id, { additionalDescriptionDe: value });

    expect(h.updateDocumentItem).toHaveBeenCalledWith("company-1", item.id, {
      additional_description_de: null,
    });
  });

  it("lehnt Positionen finalisierter Dokumente vor dem Schreiben ab", async () => {
    h.isDraftDocument.mockResolvedValue(false);

    await expect(updateItem(item.id, { additionalDescriptionDe: "Text" })).resolves.toEqual({
      error: "draftNotFound",
    });
    expect(h.updateDocumentItem).not.toHaveBeenCalled();
  });
});
