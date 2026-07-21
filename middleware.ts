import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { updateSession } from "@/lib/supabase/middleware";

const intlMiddleware = createIntlMiddleware(routing);

const SUPPORTED_LOCALES: readonly string[] = routing.locales;
function copySessionCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => to.cookies.set(cookie));
  return to;
}

function loginRedirect(request: NextRequest, locale: string, sessionResponse: NextResponse) {
  return copySessionCookies(
    sessionResponse,
    NextResponse.redirect(new URL(`/${locale}/login`, request.url)),
  );
}

function dashboardRedirect(request: NextRequest, locale: string, sessionResponse: NextResponse) {
  return copySessionCookies(
    sessionResponse,
    NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url)),
  );
}

function unauthorizedApiResponse(sessionResponse: NextResponse) {
  return copySessionCookies(
    sessionResponse,
    NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Sprachauswahl liegt bewusst ohne Locale-Präfix und bleibt immer erreichbar.
  // next-intl würde hier sonst eine Locale erzwingen.
  if (pathname === "/language") {
    return (await updateSession(request)).response;
  }

  // API-Routen sind sprachneutral. next-intl (localePrefix: "always") würde
  // /api/... sonst auf /de/api/... umleiten → 404 (die Route liegt unter /api).
  // Session trotzdem frisch halten, damit der Handler den Nutzer kennt.
  if (pathname === "/api" || pathname.startsWith("/api/")) {
    const session = await updateSession(request);
    return session.user ? session.response : unauthorizedApiResponse(session.response);
  }

  // Root-Gate: ohne gültige Sprache zur Sprachauswahl, sonst direkt zum Login.
  if (pathname === "/") {
    const locale = request.cookies.get("NEXT_LOCALE")?.value;
    const target =
      locale && SUPPORTED_LOCALES.includes(locale)
        ? `/${locale}/login`
        : "/language";
    return NextResponse.redirect(new URL(target, request.url));
  }

  const intlResponse = intlMiddleware(request);
  const session = await updateSession(request, intlResponse);
  const locale = pathname.split("/")[1];

  if (SUPPORTED_LOCALES.includes(locale)) {
    // Der locale-Einstieg ist kein eigener Screen: angemeldete Nutzer gehen
    // direkt ins Dashboard, alle anderen zum Login.
    if (pathname === `/${locale}` || pathname === `/${locale}/`) {
      return session.user
        ? dashboardRedirect(request, locale, session.response)
        : loginRedirect(request, locale, session.response);
    }

    const isLoginPath = pathname === `/${locale}/login` || pathname === `/${locale}/login/`;
    if (!isLoginPath && !session.user) {
      return loginRedirect(request, locale, session.response);
    }
  }

  return session.response;
}

export const config = {
  matcher: [
    "/",
    "/language",
    "/api/:path*",
    "/(de|tr|ar)/:path*",
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|js|json)$).*)",
  ],
};
