import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  getCurrentCompanyId: vi.fn(),
  isDraftDocument: vi.fn(),
  getDraftTaxConfig: vi.fn(),
  setDraftDocumentTotals: vi.fn(),
  getNextItemPosition: vi.fn(),
  insertDocumentItems: vi.fn(),
  getDraftItems: vi.fn(),
  getServiceSnapshot: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: h.revalidatePath }));
vi.mock("@/lib/supabase/auth", () => ({ getCurrentCompanyId: h.getCurrentCompanyId }));
vi.mock("@/lib/integrations/anthropic/nachweis-extractor", () => ({
  NachweisExtractionError: class extends Error {},
  extractNachweis: vi.fn(),
}));
vi.mock("@/lib/repositories/ai-usage", () => ({ consumeCustomerAiQuota: vi.fn() }));
vi.mock("@/lib/repositories/document-drafts", () => ({
  isDraftDocument: h.isDraftDocument,
  getDraftTaxConfig: h.getDraftTaxConfig,
  setDraftDocumentTotals: h.setDraftDocumentTotals,
}));
vi.mock("@/lib/repositories/document-items", () => ({
  getNextItemPosition: h.getNextItemPosition,
  insertDocumentItems: h.insertDocumentItems,
  getDraftItems: h.getDraftItems,
}));
vi.mock("@/lib/repositories/services", () => ({ getServiceSnapshot: h.getServiceSnapshot }));

import { addNachweisItems } from "./nachweis-actions";

const ZUSATZ = "lt. Stundennachweis Nr. 2026-040, 07.09.–12.09.2026";

beforeEach(() => {
  vi.clearAllMocks();
  h.getCurrentCompanyId.mockResolvedValue("company-1");
  h.isDraftDocument.mockResolvedValue(true);
  h.getDraftTaxConfig.mockResolvedValue({ defaultTaxRate: 0 });
  h.getNextItemPosition.mockResolvedValue(3);
  h.insertDocumentItems.mockResolvedValue({});
  h.getDraftItems.mockResolvedValue([]);
  h.getServiceSnapshot.mockResolvedValue({
    description_de: "Monteurstunde",
    unit: "Std.",
    default_price: 4800,
  });
});

describe("addNachweisItems", () => {
  it("legt alle Zeilen in einem Insert an, Katalogpreis und -begriff vom Server", async () => {
    const result = await addNachweisItems("document-1", [
      // Ein eingeschmuggelter Preis an einer Katalogzeile wird ignoriert.
      { kind: "catalog", serviceId: "svc-mo", amount: 88, unitPrice: 1, additionalDescriptionDe: ZUSATZ },
      {
        kind: "free",
        descriptionDe: "Arbeitsstunden",
        amount: 52,
        unit: "Std.",
        unitPrice: 3800,
        additionalDescriptionDe: ZUSATZ,
      },
    ]);

    expect("error" in result).toBe(false);
    expect(h.insertDocumentItems).toHaveBeenCalledOnce();
    const [, , rows] = h.insertDocumentItems.mock.calls[0];
    expect(rows).toEqual([
      expect.objectContaining({
        serviceId: "svc-mo",
        position: 3,
        descriptionDe: "Monteurstunde",
        unit: "Std.",
        unitPrice: 4800,
        amount: 88,
        totalAmount: 422_400,
        additionalDescriptionDe: ZUSATZ,
      }),
      expect.objectContaining({
        serviceId: null,
        position: 4,
        descriptionDe: "Arbeitsstunden",
        unitPrice: 3800,
        totalAmount: 197_600,
      }),
    ]);
    expect(h.setDraftDocumentTotals).toHaveBeenCalledOnce();
  });

  it("verwirft ungültige Zeilen und fremde Katalogeinträge ohne zu schreiben", async () => {
    await expect(addNachweisItems("document-1", [{ kind: "catalog", amount: 1 }])).resolves.toEqual({
      error: "linesInvalid",
    });
    h.getServiceSnapshot.mockResolvedValue(null);
    await expect(
      addNachweisItems("document-1", [
        { kind: "catalog", serviceId: "fremd", amount: 1, additionalDescriptionDe: null },
      ]),
    ).resolves.toEqual({ error: "serviceNotFound" });
    expect(h.insertDocumentItems).not.toHaveBeenCalled();
  });

  it("schreibt nicht in festgeschriebene Dokumente", async () => {
    h.isDraftDocument.mockResolvedValue(false);
    await expect(
      addNachweisItems("document-1", [
        { kind: "catalog", serviceId: "svc-mo", amount: 1, additionalDescriptionDe: null },
      ]),
    ).resolves.toEqual({ error: "draftNotFound" });
    expect(h.insertDocumentItems).not.toHaveBeenCalled();
  });
});
