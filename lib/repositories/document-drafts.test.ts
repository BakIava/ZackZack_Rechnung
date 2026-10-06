import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  createClient: vi.fn(),
  getCurrentCompanyId: vi.fn(),
  getDocumentIdsWithItems: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: h.createClient }));
vi.mock("@/lib/supabase/auth", () => ({
  getCurrentCompanyId: h.getCurrentCompanyId,
  getCurrentUser: vi.fn(),
}));
vi.mock("./document-items", () => ({ getDocumentIdsWithItems: h.getDocumentIdsWithItems }));

import { findReusableDraft, setDraftServiceLocation } from "./document-drafts";

beforeEach(() => {
  vi.clearAllMocks();
  h.getCurrentCompanyId.mockResolvedValue("company-1");
});

describe("document-specific service location", () => {
  it("übernimmt den Einsatzort eines begonnenen Belegs nicht in einen neuen Draft", async () => {
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [
        { id: "with-location", service_location: { name: "Baustelle" } },
        { id: "empty", service_location: null },
      ] }),
    };
    h.createClient.mockResolvedValue({ from: vi.fn().mockReturnValue(query) });
    h.getDocumentIdsWithItems.mockResolvedValue(new Set<string>());

    await expect(findReusableDraft("company-1")).resolves.toBe("empty");
    expect(query.select).toHaveBeenCalledWith("id, service_location");
  });

  it("schreibt den Snapshot nur auf einen eigenen Entwurf", async () => {
    const query = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: "doc-1" }, error: null }),
    };
    h.createClient.mockResolvedValue({ from: vi.fn().mockReturnValue(query) });
    const location = {
      name: "", street: "Otto-Hahn-Str.", houseNumber: "8", postcode: "",
      city: "Ingelheim", addressExtra: "1. OG rechts",
    };

    await expect(setDraftServiceLocation("doc-1", location)).resolves.toEqual({});
    expect(query.update).toHaveBeenCalledWith({ service_location: location });
    expect(query.eq).toHaveBeenCalledWith("id", "doc-1");
    expect(query.eq).toHaveBeenCalledWith("company_id", "company-1");
    expect(query.eq).toHaveBeenCalledWith("status", "draft");
  });
});
