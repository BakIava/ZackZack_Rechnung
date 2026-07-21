import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  createClient: vi.fn(),
  getUser: vi.fn(),
  getSession: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
}));

vi.mock("react", () => ({
  cache: <Args extends unknown[], Result>(fn: (...args: Args) => Result) => fn,
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: h.createClient }));

import { getCurrentCompanyId, getCurrentUser } from "./auth";

function accessToken(payload: Record<string, unknown>): string {
  const encoded = btoa(JSON.stringify(payload))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `header.${encoded}.signature`;
}

beforeEach(() => {
  vi.clearAllMocks();
  h.createClient.mockResolvedValue({
    auth: { getUser: h.getUser, getSession: h.getSession },
    from: h.from,
  });
  h.from.mockReturnValue({ select: h.select });
  h.select.mockReturnValue({ eq: h.eq });
  h.eq.mockReturnValue({ maybeSingle: h.maybeSingle });
});

describe("Supabase-Auth-Helfer", () => {
  it("ermittelt die Firma ohne einen zweiten getUser-Roundtrip", async () => {
    h.getSession.mockResolvedValue({
      data: { session: { access_token: accessToken({ sub: "user-1" }) } },
    });
    h.maybeSingle.mockResolvedValue({ data: { company_id: "company-1" } });

    await expect(getCurrentCompanyId()).resolves.toBe("company-1");

    expect(h.getSession).toHaveBeenCalledOnce();
    expect(h.getUser).not.toHaveBeenCalled();
    expect(h.from).toHaveBeenCalledWith("users");
    expect(h.select).toHaveBeenCalledWith("company_id");
    expect(h.eq).toHaveBeenCalledWith("id", "user-1");
  });

  it.each([
    { session: null },
    { session: { access_token: "invalid" } },
    { session: { access_token: accessToken({ role: "authenticated" }) } },
  ])("bricht ohne verwertbaren Session-Subject vor dem Profil-Lookup ab", async (data) => {
    h.getSession.mockResolvedValue({ data });

    await expect(getCurrentCompanyId()).resolves.toBeNull();

    expect(h.from).not.toHaveBeenCalled();
    expect(h.getUser).not.toHaveBeenCalled();
  });

  it("liefert ohne RLS-sichtbares Profil keine Firmen-ID", async () => {
    h.getSession.mockResolvedValue({
      data: { session: { access_token: accessToken({ sub: "foreign-user" }) } },
    });
    h.maybeSingle.mockResolvedValue({ data: null });

    await expect(getCurrentCompanyId()).resolves.toBeNull();

    expect(h.eq).toHaveBeenCalledWith("id", "foreign-user");
    expect(h.getUser).not.toHaveBeenCalled();
  });

  it("validiert User-Daten weiterhin explizit ueber getUser", async () => {
    const user = { id: "user-1" };
    h.getUser.mockResolvedValue({ data: { user } });

    await expect(getCurrentUser()).resolves.toBe(user);

    expect(h.getUser).toHaveBeenCalledOnce();
    expect(h.getSession).not.toHaveBeenCalled();
  });
});
