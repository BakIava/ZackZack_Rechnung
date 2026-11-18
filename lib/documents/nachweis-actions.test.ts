import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  getCurrentCompanyId: vi.fn(),
  isDraftDocument: vi.fn(),
  getDraftTaxConfig: vi.fn(),
  setDraftDocumentTotals: vi.fn(),
  getNextItemPosition: vi.fn(),
  insertDocumentItems: vi.fn(),
  getDraftItems: vi.fn(),
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

import { addNachweisItems } from "./nachweis-actions";

const ZUSATZ = "lt. Stundennachweis Nr. 2026-040, 07.09.–12.09.2026";
const line = (amount: number, unitPrice: number) => ({
  kind: "free",
  descriptionDe: "633 636 611 Arbeit EG/1.OG",
  amount,
  unit: "Std.",
  unitPrice,
  additionalDescriptionDe: ZUSATZ,
});

beforeEach(() => {
  vi.clearAllMocks();
  h.getCurrentCompanyId.mockResolvedValue("company-1");
  h.isDraftDocument.mockResolvedValue(true);
  h.getDraftTaxConfig.mockResolvedValue({ defaultTaxRate: 0 });
  h.getNextItemPosition.mockResolvedValue(3);
  h.insertDocumentItems.mockResolvedValue({});
  h.getDraftItems.mockResolvedValue([]);
});

describe("addNachweisItems", () => {
  it("legt alle Zeilen in einem Insert ab der nächsten freien Position an", async () => {
    const result = await addNachweisItems("document-1", [line(128, 4800), line(52, 3800)]);

    expect("error" in result).toBe(false);
    expect(h.insertDocumentItems).toHaveBeenCalledOnce();
    const [, , rows] = h.insertDocumentItems.mock.calls[0];
    expect(rows).toEqual([
      expect.objectContaining({
        serviceId: null,
        position: 3,
        descriptionDe: "633 636 611 Arbeit EG/1.OG",
        additionalDescriptionDe: ZUSATZ,
        amount: 128,
        unitPrice: 4800,
        totalAmount: 614_400,
      }),
      expect.objectContaining({ position: 4, amount: 52, unitPrice: 3800, totalAmount: 197_600 }),
    ]);
    expect(h.setDraftDocumentTotals).toHaveBeenCalledOnce();
  });

  it("verwirft ungültige Zeilen ohne zu schreiben", async () => {
    await expect(addNachweisItems("document-1", [line(1, 0)])).resolves.toEqual({
      error: "linesInvalid",
    });
    expect(h.insertDocumentItems).not.toHaveBeenCalled();
  });

  it("schreibt nicht in festgeschriebene Dokumente", async () => {
    h.isDraftDocument.mockResolvedValue(false);
    await expect(addNachweisItems("document-1", [line(1, 4800)])).resolves.toEqual({
      error: "draftNotFound",
    });
    expect(h.insertDocumentItems).not.toHaveBeenCalled();
  });
});
