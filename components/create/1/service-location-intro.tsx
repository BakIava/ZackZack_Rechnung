"use client";

import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import "./service-location-intro.css";

interface ServiceLocationIntroProps {
  value: string;
  onChange: (value: string) => void;
  onFill: () => void;
  onManual: () => void;
}

export function ServiceLocationIntro({ value, onChange, onFill, onManual }: ServiceLocationIntroProps) {
  const t = useTranslations("ServiceLocation");
  return (
    <div className="location-intro">
      <div className="location-intro__body">
        <span className="location-intro__spark"><Sparkles size={26} aria-hidden /></span>
        <label htmlFor="location-source" className="location-intro__lead">{t("intro")}</label>
        <textarea id="location-source" value={value} onChange={(event) => onChange(event.target.value)}
          placeholder={t("exampleText")} rows={4} maxLength={1200} autoFocus dir="auto" />
        <button type="button" className="location-intro__example" onClick={() => onChange(t("exampleText"))}>
          {t("example")}
        </button>
        <p className="location-intro__notice">{t("aiHint")}</p>
      </div>
      <div className="location-intro__footer">
        <button type="button" className="location-intro__manual" onClick={onManual}>{t("manual")}</button>
        <button type="button" className="location-intro__ai" onClick={onFill} disabled={!value.trim()}>
          <Sparkles size={18} aria-hidden />{t("aiFill")}
        </button>
      </div>
    </div>
  );
}
