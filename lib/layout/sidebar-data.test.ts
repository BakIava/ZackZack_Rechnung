import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  getCompanyNameAndDirector: vi.fn(),
  countCustomers: vi.fn(),
  countServices: vi.fn(),
}));

vi.mock("react", () => ({
  cache:
    <Args extends unknown[], Result>(fn: (...args: Args) => Result) => {
      let cached: Result | undefined;
      return (...args: Args): Result => {
        cached ??= fn(...args);
        return cached;
      };
    },
}));
vi.mock("@/lib/repositories/companies", () => ({
  getCompanyNameAndDirector: h.getCompanyNameAndDirector,
}));
vi.mock("@/lib/repositories/customers", () => ({
  countCustomers: h.countCustomers,
}));
vi.mock("@/lib/repositories/services", () => ({
  countServices: h.countServices,
}));

import { getSidebarData } from "./sidebar-data";

beforeEach(() => {
  vi.clearAllMocks();
  h.getCompanyNameAndDirector.mockResolvedValue({
    name: "Yılmaz Malerbetrieb",
    director: "Mehmet Yılmaz",
  });
  h.countCustomers.mockResolvedValue(12);
  h.countServices.mockResolvedValue(8);
});

describe("getSidebarData", () => {
  it("teilt identische Sidebar-Reads innerhalb eines Server-Renders", async () => {
    const [sidebar, dashboard] = await Promise.all([
      getSidebarData(),
      getSidebarData(),
    ]);

    expect(sidebar).toBe(dashboard);
    expect(sidebar).toEqual({
      company: {
        name: "Yılmaz Malerbetrieb",
        director: "Mehmet Yılmaz",
      },
      customerCount: 12,
      catalogCount: 8,
    });
    expect(h.getCompanyNameAndDirector).toHaveBeenCalledOnce();
    expect(h.countCustomers).toHaveBeenCalledOnce();
    expect(h.countServices).toHaveBeenCalledOnce();
  });
});
