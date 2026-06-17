/**
 * Money is always stored as integer cents (never float euros).
 * Format only at the display/render boundary.
 */

import { DOCUMENT_LOCALE } from "@/lib/document-locale";

export function formatCents(
  cents: number,
  locale: string = DOCUMENT_LOCALE,
  currency: string = "EUR",
): string {
  return new Intl.NumberFormat(locale === "de" ? "de-DE" : locale, {
    style: "currency",
    currency,
  }).format(cents / 100);
}

export function eurosToCents(euros: number): number {
  return Math.round(euros * 100);
}
