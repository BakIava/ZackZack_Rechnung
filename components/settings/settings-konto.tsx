"use client";

import { useTranslations } from "next-intl";
import { LogOut } from "lucide-react";
import { COMPANY } from "@/lib/demo/dashboard-data";

const STROKE = 1.75;
const DEMO_LOGIN_EMAIL = "ahmet.yilmaz@gmail.com";

export function SettingsKonto() {
  const t = useTranslations("Settings");

  return (
    <section className="set-card">
      <div className="set-card-h">
        <div className="set-card-htop">
          <div className="set-card-t">{t("cAnmeldung")}</div>
        </div>
      </div>
      <div className="set-card-b">
        <div className="set-acct-row">
          <span className="set-acct-av">{COMPANY.initials}</span>
          <div>
            <div className="set-acct-mail">{DEMO_LOGIN_EMAIL}</div>
            <div className="set-acct-sub">
              <i />
              {t("signedIn")}
            </div>
          </div>
        </div>
      </div>
      <div className="set-card-f" style={{ justifyContent: "flex-start" }}>
        <button className="set-ghost">
          <LogOut size={17} strokeWidth={STROKE} aria-hidden />
          {t("logout")}
        </button>
      </div>
    </section>
  );
}
