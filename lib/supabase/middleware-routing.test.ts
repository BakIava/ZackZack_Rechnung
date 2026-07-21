import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";

const mocks = vi.hoisted(() => ({
  intlMiddleware: vi.fn(),
  updateSession: vi.fn(),
}));

vi.mock("next-intl/middleware", () => ({
  default: () => mocks.intlMiddleware,
}));

vi.mock("@/lib/supabase/middleware", () => ({
  updateSession: mocks.updateSession,
}));

import { config, middleware } from "../../middleware";

let sessionUser: User | null;

function request(pathname: string): NextRequest {
  return new NextRequest(`https://zackzack.example${pathname}`);
}

describe("Middleware-Routing", () => {
  beforeEach(() => {
    sessionUser = null;
    mocks.intlMiddleware.mockReset();
    mocks.intlMiddleware.mockImplementation((currentRequest: NextRequest) =>
      NextResponse.next({ request: currentRequest }),
    );
    mocks.updateSession.mockReset();
    mocks.updateSession.mockImplementation(
      async (currentRequest: NextRequest, response?: NextResponse) => ({
        response: response ?? NextResponse.next({ request: currentRequest }),
        user: sessionUser,
      }),
    );
  });

  it.each(["/api/settings", "/api/export.json", "/api/script.js"])(
    "wendet die Middleware auf %s an",
    (url) => {
      expect(
        unstable_doesMiddlewareMatch({ config, nextConfig: {}, url }),
      ).toBe(true);
    },
  );

  it("liefert für eine anonyme API-Anfrage 401", async () => {
    const response = await middleware(request("/api/export.json"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("leitet anonyme App-Anfragen zum sprachrichtigen Login", async () => {
    const response = await middleware(request("/tr/customers"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://zackzack.example/tr/login");
  });

  it("leitet einen eingeloggten Locale-Einstieg zum Dashboard", async () => {
    sessionUser = { id: "user-1" } as User;

    const response = await middleware(request("/ar"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://zackzack.example/ar/dashboard");
  });

  it("lässt den Login für anonyme Nutzer erreichbar", async () => {
    const response = await middleware(request("/de/login"));

    expect(response.status).toBe(200);
  });
});
