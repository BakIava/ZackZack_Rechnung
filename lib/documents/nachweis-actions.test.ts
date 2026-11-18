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
  findDocumentsMentioningNachweis: vi.fn(),
}));

vi.mock("@/lib/repositories/nachweis-usages", () => ({
  findDocumentsMentioningNachweis: h.findDocumentsMentioningNachweis,
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

import { addNachweisItems, findNachweisUsage } from "./nachweis-actions";

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

describe("findNachweisUsage", () => {
  const usage = (documentId: string, zusatz: string, extra: Record<string, unknown> = {}) => ({
    documentId,
    additionalDescriptionDe: zusatz,
    docType: "invoice",
    documentNumber: "R-2026-041",
    status: "finalized",
    ...extra,
  });

  it("meldet Dokumente mit genau dieser Nummer, ohne Stornos und Doppelte", async () => {
    h.findDocumentsMentioningNachweis.mockResolvedValue([
      usage("doc-a", ZUSATZ),
      usage("doc-a", ZUSATZ),
      usage("doc-b", "lt. Stundennachweis Nr. 2026-0401, 07.09.–12.09.2026"),
      usage("doc-c", ZUSATZ, { status: "cancelled" }),
      usage("document-1", ZUSATZ, { status: "draft", documentNumber: null, docType: "quote" }),
    ]);

    await expect(findNachweisUsage("document-1", " 2026-040 ")).resolves.toEqual([
      { documentId: "doc-a", docType: "invoice", documentNumber: "R-2026-041", sameDocument: false },
      { documentId: "document-1", docType: "quote", documentNumber: null, sameDocument: true },
    ]);
    expect(h.findDocumentsMentioningNachweis).toHaveBeenCalledWith(
      "company-1",
      "%lt. Stundennachweis Nr. 2026-040%",
    );
  });

  it("sucht ohne Nummer gar nicht erst", async () => {
    await expect(findNachweisUsage("document-1", "  ")).resolves.toEqual([]);
    expect(h.findDocumentsMentioningNachweis).not.toHaveBeenCalled();
  });
});
