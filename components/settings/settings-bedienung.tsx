"use client";

import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { Check, Globe } from "lucide-react";

const STROKE = 1.75;

const LANGS = [
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "tr", name: "Türkçe", flag: "🇹🇷" },
  { code: "ar", name: "العربية", flag: "🇸🇦" },
] as const;

type LangCode = (typeof LANGS)[number]["code"];

interface SettingsBedienungProps {
  locale: string;
  dir: "ltr" | "rtl";
}

export function SettingsBedienung({ locale }: SettingsBedienungProps) {
  const t = useTranslations("Settings");
  const router = useRouter();
  const pathname = usePathname();

  function switchLang(code: LangCode) {
    if (code === locale) return;
    router.replace(pathname, { locale: code });
  }

  return (
    <>
      <section className="set-card">
        <div className="set-card-h">
          <div className="set-card-htop">
            <div>
              <div className="set-card-t">{t("cSprache")}</div>
              <div className="set-card-s">{t("spracheSub")}</div>
            </div>
          </div>
        </div>
        <div className="set-card-b">
          <div className="set-langtiles">
            {LANGS.map(({ code, name, flag }) => (
              <button
                key={code}
                className="set-langtile"
                data-on={locale === code ? "1" : "0"}
                onClick={() => switchLang(code)}
                aria-pressed={locale === code}
              >
                {locale === code && (
                  <span className="set-langtile-check">
                    <Check size={13} strokeWidth={2.5} aria-hidden />
                  </span>
                )}
                <span className="set-langtile-flag">{flag}</span>
                <div className="set-langtile-name">{name}</div>
                <div className="set-langtile-sub">{code.toUpperCase()}</div>
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="set-note">
        <span className="set-note-ic">
          <Globe size={17} strokeWidth={STROKE} aria-hidden />
        </span>
        <div className="set-note-t">{t("langNote")}</div>
      </div>
    </>
  );
}
