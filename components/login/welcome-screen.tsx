import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import "./welcome-screen.css";

interface WelcomeScreenProps {
  locale: string;
  leaving: boolean;
  onSignIn: () => void;
  onRegister: () => void;
}

const LANG_NAMES: Record<string, string> = {
  de: "Deutsch",
  tr: "Türkçe",
  ar: "العربية",
};

/** Vorgelagerter Willkommensscreen: Anmeldung oder Registrierung wählen. */
export function WelcomeScreen({ locale, leaving, onSignIn, onRegister }: WelcomeScreenProps) {
  const t = useTranslations("Login");

  return (
    <div className={"auth-welcome" + (leaving ? " is-leaving" : "")}>
      <div className="aw-bg" />
      <div className="aw-content">
        <div className="aw-logo">
          <Image
            className="zz-mark"
            src="/assets/zackzack-mark.png"
            alt="ZACK ZACK RECHNUNG"
            width={548}
            height={412}
            priority
          />
          <div className="zz-word">
            <b>ZACK ZACK</b>
            <span>RECHNUNG</span>
          </div>
        </div>
        <p className="aw-slogan">{t("welcomeSlogan")}</p>
        <div className="aw-actions">
          <button type="button" className="aw-btn aw-btn--primary" onClick={onSignIn}>
            {t("welcomeSignIn")}
            <ArrowRight size={21} aria-hidden />
          </button>
          <button type="button" className="aw-btn aw-btn--ghost" onClick={onRegister}>
            {t("welcomeRegister")}
          </button>
        </div>
      </div>
      <div className="aw-langs">
        {routing.locales.map((c) => (
          <Link
            key={c}
            href="/login"
            locale={c}
            className="aw-lang"
            data-on={locale === c ? "1" : "0"}
          >
            {LANG_NAMES[c] ?? c.toUpperCase()}
          </Link>
        ))}
      </div>
    </div>
  );
}
