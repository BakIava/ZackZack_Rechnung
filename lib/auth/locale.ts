import { routing, type Locale } from "@/i18n/routing";

/** Begrenzt Redirect-Ziele aus Server-Action-Parametern auf bekannte Locales. */
export function resolveAuthLocale(locale: unknown): Locale {
  return routing.locales.find((supportedLocale) => supportedLocale === locale)
    ?? routing.defaultLocale;
}
