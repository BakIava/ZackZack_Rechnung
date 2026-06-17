import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { updateSession } from "@/lib/supabase/middleware";

const intlMiddleware = createIntlMiddleware(routing);

const SUPPORTED_LOCALES: readonly string[] = routing.locales;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Sprachauswahl liegt bewusst ohne Locale-Präfix und bleibt immer erreichbar.
  // next-intl würde hier sonst eine Locale erzwingen.
  if (pathname === "/language") {
    return updateSession(request);
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
  return updateSession(request, intlResponse);
}

export const config = {
  matcher: [
    "/",
    "/language",
    "/(de|tr|ar)/:path*",
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|js|json)$).*)",
  ],
};
