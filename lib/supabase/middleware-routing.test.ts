import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import {
  INACTIVITY_TIMEOUT_MS,
  LAST_ACTIVITY_COOKIE,
  SESSION_LOCK_COOKIE,
} from "@/lib/auth/session-lock";

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
let hasCompletedSetup: boolean;

function request(pathname: string, cookieValues: Record<string, string> = {}): NextRequest {
  const currentRequest = new NextRequest(`https://zackzack.example${pathname}`);
  Object.entries(cookieValues).forEach(([name, value]) => currentRequest.cookies.set(name, value));
  return currentRequest;
}

describe("Middleware-Routing", () => {
  beforeEach(() => {
    sessionUser = null;
    hasCompletedSetup = false;
    mocks.intlMiddleware.mockReset();
    mocks.intlMiddleware.mockImplementation((currentRequest: NextRequest) =>
      NextResponse.next({ request: currentRequest }),
    );
    mocks.updateSession.mockReset();
    mocks.updateSession.mockImplementation(
      async (currentRequest: NextRequest, response?: NextResponse) => ({
        response: response ?? NextResponse.next({ request: currentRequest }),
        user: sessionUser,
        hasCompletedSetup,
      }),
    );
  });

  it("sperrt nach 15 Minuten und bewahrt den aktuellen Create-Schritt als Rueckkehrziel", async () => {
    sessionUser = { id: "user-1" } as User;
    const response = await middleware(request("/de/create/doc-1/2?fix=customer", {
      [LAST_ACTIVITY_COOKIE]: String(Date.now() - INACTIVITY_TIMEOUT_MS),
    }));

    const target = new URL(response.headers.get("location") as string);
    expect(target.pathname).toBe("/de/login");
    expect(target.searchParams.get("unlock")).toBe("1");
    expect(target.searchParams.get("next")).toBe("/de/create/doc-1/2?fix=customer");
    expect(response.cookies.get(SESSION_LOCK_COOKIE)?.value).toBe("1");
  });

  it("laesst nur den Lock-Screen bei gesetzter Sperre durch", async () => {
    sessionUser = { id: "user-1" } as User;

    const response = await middleware(request("/tr/login?unlock=1&next=/tr/dashboard", {
      [SESSION_LOCK_COOKIE]: "1",
    }));

    expect(response.status).toBe(200);
  });

  it("bewahrt das Rueckkehrziel auch beim timer-gesteuerten Lock-Redirect", async () => {
    sessionUser = { id: "user-1" } as User;
    const response = await middleware(request("/de/login?unlock=1&next=/de/create/doc-1/2", {
      [LAST_ACTIVITY_COOKIE]: String(Date.now() - INACTIVITY_TIMEOUT_MS),
    }));

    const target = new URL(response.headers.get("location") as string);
    expect(target.searchParams.get("next")).toBe("/de/create/doc-1/2");
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
    hasCompletedSetup = true;

    const response = await middleware(request("/ar"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://zackzack.example/ar/dashboard");
  });

  it("lässt den Login für anonyme Nutzer erreichbar", async () => {
    const response = await middleware(request("/de/login"));

    expect(response.status).toBe(200);
  });

  it("leitet Nutzer mit abgeschlossenem Setup von jedem Setup-Schritt zum Dashboard", async () => {
    sessionUser = { id: "user-1" } as User;
    hasCompletedSetup = true;

    const response = await middleware(request("/tr/setup/3"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://zackzack.example/tr/dashboard");
  });

  it("lÃ¤sst Nutzer ohne abgeschlossenes Setup im Setup", async () => {
    sessionUser = { id: "user-1" } as User;

    const response = await middleware(request("/de/setup"));

    expect(response.status).toBe(200);
  });
});
