import { beforeEach, describe, expect, it, vi } from "vitest";
import { changeSelectedDraftItems } from "./item-bulk-actions";

const mock = vi.hoisted(() => ({
  getCurrentCompanyId: vi.fn(),
  rpc: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/supabase/auth", () => ({ getCurrentCompanyId: mock.getCurrentCompanyId }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc: mock.rpc }) }));
vi.mock("next/cache", () => ({ revalidatePath: mock.revalidatePath }));

const documentId = "10000000-0000-0000-0000-000000000001";
const first = "c0000000-0000-0000-0000-000000000001";
const second = "c0000000-0000-0000-0000-000000000002";

beforeEach(() => {
  vi.resetAllMocks();
  mock.getCurrentCompanyId.mockResolvedValue("company");
  mock.rpc.mockResolvedValue({ data: [], status: 200, error: null });
});

describe("Sammelaktionen im Dokumententwurf", () => {
  it.each([
    [[], { kind: "delete" }],
    [[first, first.toUpperCase()], { kind: "delete" }],
    [[first, 123], { kind: "delete" }],
    [[first], { kind: "vat", taxRate: 20 }],
    [[first], { kind: "vat" }],
  ])("prüft Auswahl und Satz vor dem RPC (%j, %j)", async (ids, change) => {
    await expect(changeSelectedDraftItems(documentId, ids, change)).resolves.toEqual({ error: "selectionInvalid" });
    expect(mock.rpc).not.toHaveBeenCalled();
  });

  it("prüft Anmeldung vor einer Mutation", async () => {
    mock.getCurrentCompanyId.mockResolvedValue(null);
    await expect(changeSelectedDraftItems(documentId, [first], { kind: "delete" })).resolves.toEqual({
      error: "notAuthenticated",
    });
    expect(mock.rpc).not.toHaveBeenCalled();
  });

  it("übergibt den Dokumentstandard und leitet Summen aus der einen Serverantwort ab", async () => {
    mock.rpc.mockResolvedValue({
      error: null,
      status: 200,
      data: [
        { id: first, position: 1, tax_rate: 7, total_amount: 50, tax_amount: 4, gross_amount: 54, tax_rate_overridden: false },
        { id: second, position: 2, tax_rate: 19, total_amount: 100, tax_amount: 19, gross_amount: 119, tax_rate_overridden: true },
      ],
    });
    const result = await changeSelectedDraftItems(documentId, [first.toUpperCase()], { kind: "vat", taxRate: null });
    expect(result).toMatchObject({
      items: [{ id: first, taxRateOverridden: false }, { id: second, taxRateOverridden: true }],
      totals: { netAmount: 150, taxAmount: 23, grossAmount: 173 },
    });
    expect(mock.rpc).toHaveBeenCalledExactlyOnceWith("apply_draft_item_selection", {
      p_document_id: documentId, p_item_ids: [first], p_action: "vat", p_tax_rate: null,
    });
    expect(mock.revalidatePath).toHaveBeenCalledOnce();
  });

  it("liefert eine leere Liste und Nullsummen nach dem Löschen der letzten Position", async () => {
    await expect(changeSelectedDraftItems(documentId, [first], { kind: "delete" })).resolves.toEqual({
      items: [], totals: { netAmount: 0, taxAmount: 0, grossAmount: 0, taxGroups: [] },
    });
    expect(mock.rpc).toHaveBeenCalledExactlyOnceWith("apply_draft_item_selection", {
      p_document_id: documentId, p_item_ids: [first], p_action: "delete", p_tax_rate: null,
    });
  });

  it.each([
    ["bulk_items_selection_changed", 400, "selectionChanged"],
    ["bulk_items_draft_not_found", 400, "draftNotFound"],
    ["bulk_items_invalid", 400, "selectionInvalid"],
    ["sensitive database error", 400, "bulkSaveFailed"],
    ["gateway timed out", 504, "bulkOutcomeUnknown"],
  ])("liefert nur einen stabilen Fehlercode bei %s", async (message, status, error) => {
    mock.rpc.mockResolvedValue({ data: null, status, error: { message } });
    await expect(changeSelectedDraftItems(documentId, [first, second], { kind: "delete" })).resolves.toEqual({ error });
    expect(mock.rpc).toHaveBeenCalledOnce();
    expect(mock.revalidatePath).not.toHaveBeenCalled();
  });
});
