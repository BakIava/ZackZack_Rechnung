import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  createClient: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  or: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: h.createClient }));
vi.mock("@/lib/supabase/auth", () => ({ getCurrentCompanyId: vi.fn() }));
vi.mock("./document-relations", () => ({ getDocumentRelations: vi.fn() }));

import { getInvoicePaymentAmounts } from "./document-dashboard";

beforeEach(() => {
  vi.clearAllMocks();
  h.createClient.mockResolvedValue({ from: h.from });
  h.from.mockReturnValue({ select: h.select });
  h.select.mockReturnValue({ eq: h.eq });
  h.eq.mockReturnValue({ or: h.or });
  h.or.mockResolvedValue({
    data: [{ status: "paid", total_amount: 2500, paid_at: "2026-07-20" }],
  });
});

describe("getInvoicePaymentAmounts", () => {
  it("lädt offene und bezahlte Beträge in einem PostgREST-Request", async () => {
    await expect(getInvoicePaymentAmounts()).resolves.toEqual([
      { status: "paid", total_amount: 2500, paid_at: "2026-07-20" },
    ]);

    expect(h.from).toHaveBeenCalledOnce();
    expect(h.from).toHaveBeenCalledWith("documents");
    expect(h.select).toHaveBeenCalledWith("status, total_amount, paid_at");
    expect(h.eq).toHaveBeenCalledWith("document_type", "invoice");
    expect(h.or).toHaveBeenCalledWith(
      "paid_at.not.is.null,status.in.(finalized,sent)",
    );
  });
});
