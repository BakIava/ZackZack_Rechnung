import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["de", "tr", "ar"],
  defaultLocale: "de",
});

export type Locale = (typeof routing.locales)[number];

export function isRtlLocale(locale: string): boolean {
  return locale === "ar";
}
