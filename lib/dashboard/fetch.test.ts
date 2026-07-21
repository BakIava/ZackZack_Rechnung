import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  getSidebarData: vi.fn(),
  getRecentDocuments: vi.fn(),
  getInvoicePaymentAmounts: vi.fn(),
}));

vi.mock("@/lib/layout/sidebar-data", () => ({
  getSidebarData: h.getSidebarData,
}));
vi.mock("@/lib/repositories/document-dashboard", () => ({
  getRecentDocuments: h.getRecentDocuments,
  getInvoicePaymentAmounts: h.getInvoicePaymentAmounts,
}));

import { fetchDashboardData } from "./fetch";

beforeEach(() => {
  vi.clearAllMocks();
  h.getSidebarData.mockResolvedValue({
    company: { name: "Yılmaz Malerbetrieb", director: "Mehmet Yılmaz" },
    customerCount: 12,
    catalogCount: 8,
  });
  h.getRecentDocuments.mockResolvedValue([]);
  h.getInvoicePaymentAmounts.mockResolvedValue([
    { status: "finalized", total_amount: 100, paid_at: null },
    { status: "sent", total_amount: 200, paid_at: null },
    { status: "paid", total_amount: 300, paid_at: "2026-07-20" },
    { status: "cancelled", total_amount: 400, paid_at: "2026-07-19" },
  ]);
});

describe("fetchDashboardData", () => {
  it("berechnet offene und bezahlte Summen aus einer gemeinsamen Abfrage", async () => {
    const data = await fetchDashboardData();

    expect(h.getSidebarData).toHaveBeenCalledOnce();
    expect(h.getRecentDocuments).toHaveBeenCalledWith(5);
    expect(h.getInvoicePaymentAmounts).toHaveBeenCalledOnce();
    expect(data).toMatchObject({
      companyName: "Yılmaz Malerbetrieb",
      companyInitials: "YM",
      director: "Mehmet Yılmaz",
      customerCount: 12,
      catalogCount: 8,
      openCount: 2,
      openSumCents: 300,
      paidSumCents: 700,
    });
  });
});
