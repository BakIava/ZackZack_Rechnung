"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { IdCard, Receipt, Globe, User, ShieldCheck } from "lucide-react";
import { SettingsFirma } from "./settings-firma";
import { SettingsRechnung } from "./settings-rechnung";
import { SettingsBedienung } from "./settings-bedienung";
import { SettingsKonto } from "./settings-konto";
import { SettingsRecht } from "./settings-recht";
import type { SettingsData } from "@/types/company";
import "./settings-main.css";

interface SettingsMainProps {
  dir: "ltr" | "rtl";
  locale: string;
  data: SettingsData;
}

type Section = "firma" | "rechnung" | "bedienung" | "konto" | "recht";

const STROKE = 1.75;

const SECTION_ICONS: Record<Section, ReactNode> = {
  firma:     <IdCard size={19} strokeWidth={STROKE} aria-hidden />,
  rechnung:  <Receipt size={19} strokeWidth={STROKE} aria-hidden />,
  bedienung: <Globe size={19} strokeWidth={STROKE} aria-hidden />,
  konto:     <User size={19} strokeWidth={STROKE} aria-hidden />,
  recht:     <ShieldCheck size={19} strokeWidth={STROKE} aria-hidden />,
};

const ALL_SECTIONS: Section[] = ["firma", "rechnung", "bedienung", "konto", "recht"];

function hashToSection(hash: string): Section {
  const s = hash.replace("#", "") as Section;
  return ALL_SECTIONS.includes(s) ? s : "firma";
}

export function SettingsMain({ dir, locale, data }: SettingsMainProps) {
  const t = useTranslations("Settings");
  const [section, setSection] = useState<Section>("firma");

  useEffect(() => {
    setSection(hashToSection(window.location.hash));
    function onHash() { setSection(hashToSection(window.location.hash)); }
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  function navigate(s: Section) {
    window.location.hash = s;
  }

  const sections: { id: Section; label: string }[] = [
    { id: "firma",     label: t("navFirma") },
    { id: "rechnung",  label: t("navRechnung") },
    { id: "bedienung", label: t("navBedienung") },
    { id: "konto",     label: t("navKonto") },
    { id: "recht",     label: t("navRecht") },
  ];

  const secHeads: Record<Section, [string, string]> = {
    firma:     [t("secFirma"),     t("secFirmaSub")],
    rechnung:  [t("secRechnung"),  t("secRechnungSub")],
    bedienung: [t("secBedienung"), t("secBedienungSub")],
    konto:     [t("secKonto"),     t("secKontoSub")],
    recht:     [t("secRecht"),     t("secRechtSub")],
  };

  const [secTitle, secSub] = secHeads[section];

  return (
    <main className="dmain">
      <div className="dtopbar">
        <div>
          <div className="greet-sub">{t("subtitle")}</div>
          <div className="greet-main">{t("title")}</div>
        </div>
      </div>

      <div className="dscroll">
        <div className="set-wrap">
          <nav className="set-nav" aria-label={t("title")}>
            <div className="set-nav-lbl">{t("title")}</div>
            {sections.map((s) => (
              <button
                key={s.id}
                className="set-navitem"
                data-on={section === s.id ? "1" : "0"}
                aria-current={section === s.id ? "true" : undefined}
                onClick={() => navigate(s.id)}
              >
                {SECTION_ICONS[s.id]}
                <span>{s.label}</span>
              </button>
            ))}
          </nav>

          <div className="set-pane">
            <div className="set-sec-head">
              <div className="set-sec-t">{secTitle}</div>
              <div className="set-sec-s">{secSub}</div>
            </div>

            {section === "firma"     && <SettingsFirma company={data.company} />}
            {section === "rechnung"  && (
              <SettingsRechnung company={data.company} currentInvoiceNumber={data.currentInvoiceNumber} />
            )}
            {section === "bedienung" && <SettingsBedienung locale={locale} dir={dir} />}
            {section === "konto"     && <SettingsKonto email={data.authEmail} locale={locale} />}
            {section === "recht"     && <SettingsRecht dir={dir} />}
          </div>
        </div>
      </div>
    </main>
  );
}
