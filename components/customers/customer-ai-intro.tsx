"use client";

import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import "./customer-ai-intro.css";

interface CustomerAiIntroProps {
  value: string;
  onChange: (value: string) => void;
  /** Freitext an die KI übergeben (Felder erkennen). */
  onFill: () => void;
  /** Ohne KI direkt zum leeren Formular. */
  onManual: () => void;
}

interface Example {
  labelKey: "ncAiExCompanyLabel" | "ncAiExPrivateLabel" | "ncAiExSparseLabel";
  textKey: "ncAiExCompanyText" | "ncAiExPrivateText" | "ncAiExSparseText";
}

const EXAMPLES: Example[] = [
  { labelKey: "ncAiExCompanyLabel", textKey: "ncAiExCompanyText" },
  { labelKey: "ncAiExPrivateLabel", textKey: "ncAiExPrivateText" },
  { labelKey: "ncAiExSparseLabel", textKey: "ncAiExSparseText" },
];

/**
 * Intro-Phase des „Neuer Kunde"-Dialogs: Freitext-Eingabe, aus der die KI die
 * Felder erkennt. Beispiel-Chips füllen die Textarea; „Ohne KI" springt zum
 * manuellen Formular. Chrome-Klassen (.dmodal-body/.dmodal-foot) kommen aus
 * new-customer-modal.css (dieselbe Feature-Fläche).
 */
export function CustomerAiIntro({ value, onChange, onFill, onManual }: CustomerAiIntroProps) {
  const t = useTranslations("Create");

  return (
    <>
      <div className="dmodal-body">
        <div className="ai-intro">
          <div className="ai-hero">
            <Sparkles size={26} strokeWidth={2.4} aria-hidden />
          </div>
          <div className="ai-lead">{t("ncAiLead")}</div>
          <div className="ai-tawrap">
            <textarea
              className="ai-ta"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={t("ncAiPlaceholder")}
              rows={4}
              autoFocus
            />
          </div>
          <div className="ai-ex">
            <span className="ai-ex-lbl">{t("ncAiExamplesLabel")}:</span>
            {EXAMPLES.map((ex) => (
              <button
                key={ex.labelKey}
                type="button"
                className="ai-ex-chip"
                onClick={() => onChange(t(ex.textKey))}
              >
                {t(ex.labelKey)}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="dmodal-foot ai-foot">
        <button type="button" className="ai-manual" onClick={onManual}>
          {t("ncAiManual")}
        </button>
        <button type="button" className="ai-fill" disabled={!value.trim()} onClick={onFill}>
          <Sparkles size={18} strokeWidth={2.4} aria-hidden />
          {t("ncAiFill")}
        </button>
      </div>
    </>
  );
}
