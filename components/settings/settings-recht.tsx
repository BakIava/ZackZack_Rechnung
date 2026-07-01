"use client";

import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, ShieldCheck, Building2, FileText } from "lucide-react";

const STROKE = 1.75;

interface SettingsRechtProps {
  dir: "ltr" | "rtl";
}

export function SettingsRecht({ dir }: SettingsRechtProps) {
  const t = useTranslations("Settings");
  const Chev = dir === "rtl" ? ChevronLeft : ChevronRight;

  const docs = [
    { key: "privacy" as const, icon: <ShieldCheck size={18} strokeWidth={STROKE} aria-hidden /> },
    { key: "imprint" as const, icon: <Building2  size={18} strokeWidth={STROKE} aria-hidden /> },
    { key: "terms"   as const, icon: <FileText    size={18} strokeWidth={STROKE} aria-hidden /> },
  ];

  return (
    <>
      <section className="set-card">
        <div className="set-card-h">
          <div className="set-card-htop">
            <div className="set-card-t">{t("cDocs")}</div>
          </div>
        </div>
        <div className="set-card-b" style={{ paddingBottom: 0, gap: 0 }}>
          <div className="set-linklist">
            {docs.map(({ key, icon }) => (
              <button key={key} className="set-linkrow">
                <span className="set-linkrow-ic">{icon}</span>
                <span className="set-linkrow-t">{t(key)}</span>
                <span className="set-linkrow-chev">
                  <Chev size={18} strokeWidth={STROKE} aria-hidden />
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

    </>
  );
}
