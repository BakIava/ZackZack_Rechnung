"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { LogOut, Trash2 } from "lucide-react";
import { signOutAndRedirect } from "@/lib/settings/actions";

const STROKE = 1.75;

const MAILTO_TO = "loeschen@zack.adigebit.com";
const MAILTO_SUBJECT = "Kontolöschung Zack Zack Rechnung";

function buildMailtoBody(email: string): string {
  const body =
    `Hallo,\n\n` +
    `bitte löscht mein Konto bei Zack Zack Rechnung.\n\n` +
    `Meine registrierte E-Mail-Adresse: ${email}\n\n` +
    `Ich bestätige, dass ich meine Dokumente als PDF gesichert habe.\n\n` +
    `Viele Grüße`;
  return body;
}

interface SettingsKontoProps {
  email: string | null;
  locale: string;
}

export function SettingsKonto({ email, locale }: SettingsKontoProps) {
  const t = useTranslations("Settings");
  const [pending, startTransition] = useTransition();

  function handleLogout() {
    startTransition(async () => {
      await signOutAndRedirect(locale);
    });
  }

  const initials = (email ?? "?").slice(0, 2).toUpperCase();

  const mailtoHref =
    `mailto:${MAILTO_TO}` +
    `?subject=${encodeURIComponent(MAILTO_SUBJECT)}` +
    `&body=${encodeURIComponent(buildMailtoBody(email ?? ""))}`;

  return (
    <>
      <section className="set-card">
        <div className="set-card-h">
          <div className="set-card-htop">
            <div className="set-card-t">{t("cAnmeldung")}</div>
          </div>
        </div>
        <div className="set-card-b">
          <div className="set-acct-row">
            <span className="set-acct-av">{initials}</span>
            <div>
              <div className="set-acct-mail">{email}</div>
              <div className="set-acct-sub">
                <i />
                {t("signedIn")}
              </div>
            </div>
          </div>
        </div>
        <div className="set-card-f" style={{ justifyContent: "flex-start" }}>
          <button className="set-ghost" onClick={handleLogout} disabled={pending}>
            <LogOut size={17} strokeWidth={STROKE} aria-hidden />
            {pending ? t("saving") : t("logout")}
          </button>
        </div>
      </section>

      <section className="set-card">
        <div className="set-card-h">
          <div className="set-card-htop">
            <div className="set-card-t">{t("cDanger")}</div>
          </div>
        </div>
        <div className="set-card-b">
          <a href={mailtoHref} className="set-danger-btn">
            <Trash2 size={17} strokeWidth={STROKE} aria-hidden />
            {t("deleteBtn")}
          </a>
          <p className="set-delete-hint">{t("deleteHint")}</p>
        </div>
      </section>
    </>
  );
}
