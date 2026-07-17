import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  getCurrentCompanyId: vi.fn(),
  removeCompanyLogo: vi.fn(),
}));

vi.mock("@/lib/supabase/auth", () => ({ getCurrentCompanyId: h.getCurrentCompanyId }));
vi.mock("@/lib/repositories/companies", () => ({
  removeCompanyLogo: h.removeCompanyLogo,
  saveCompanyLogo: vi.fn(),
  updateCompany: vi.fn(),
}));
vi.mock("@/lib/company-logo/process", () => ({ prepareCompanyLogo: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

import { removeLogo } from "./actions";

beforeEach(() => {
  vi.clearAllMocks();
  h.getCurrentCompanyId.mockResolvedValue("company-1");
  h.removeCompanyLogo.mockResolvedValue({});
});

describe("removeLogo", () => {
  it("entfernt ausschließlich das Logo der angemeldeten Firma", async () => {
    await expect(removeLogo()).resolves.toEqual({ removed: true });
    expect(h.removeCompanyLogo).toHaveBeenCalledWith("company-1");
  });

  it("meldet einen Cleanup-Hinweis, lässt aber den Monogramm-Fallback zu", async () => {
    h.removeCompanyLogo.mockResolvedValue({ cleanupFailed: true });
    await expect(removeLogo()).resolves.toEqual({
      removed: true,
      warning: "logoCleanupFailed",
    });
  });
});
