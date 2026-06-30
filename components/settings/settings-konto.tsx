"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { LogOut } from "lucide-react";
import { signOutAndRedirect } from "@/lib/settings/actions";

const STROKE = 1.75;

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

  return (
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
  );
}
