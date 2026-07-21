import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const h = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  getUser: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({ createServerClient: h.createServerClient }));

import { updateSession } from "./middleware";

beforeEach(() => {
  vi.clearAllMocks();
  h.createServerClient.mockReturnValue({
    auth: { getUser: h.getUser },
    from: h.from,
  });
  h.from.mockReturnValue({ select: h.select });
  h.select.mockReturnValue({ eq: h.eq });
  h.eq.mockReturnValue({ maybeSingle: h.maybeSingle });
});

describe("updateSession", () => {
  it("validiert jeden geschuetzten Request weiterhin mit getUser", async () => {
    const user = { id: "user-1" };
    h.getUser.mockResolvedValue({ data: { user } });

    const result = await updateSession(
      new NextRequest("https://zackzack.example/de/documents"),
    );

    expect(result.user).toBe(user);
    expect(result.hasCompletedSetup).toBe(false);
    expect(h.getUser).toHaveBeenCalledOnce();
    expect(h.from).not.toHaveBeenCalled();
  });

  it("prueft den Setup-Status nur auf den dafuer vorgesehenen Routen", async () => {
    const user = { id: "user-1" };
    h.getUser.mockResolvedValue({ data: { user } });
    h.maybeSingle.mockResolvedValue({ data: { id: "user-1" } });

    const result = await updateSession(
      new NextRequest("https://zackzack.example/de/login"),
      undefined,
      { includeSetupStatus: true },
    );

    expect(result.hasCompletedSetup).toBe(true);
    expect(h.getUser).toHaveBeenCalledOnce();
    expect(h.from).toHaveBeenCalledWith("users");
    expect(h.select).toHaveBeenCalledWith("id");
    expect(h.eq).toHaveBeenCalledWith("id", "user-1");
  });
});
