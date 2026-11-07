"use client";

import { CircleMinus } from "lucide-react";
import { useTranslations } from "next-intl";
import "./deduction-toggle.css";

interface DeductionToggleProps {
  pressed: boolean;
  onChange: (pressed: boolean) => void;
}

/**
 * Schalter „Abzug": macht den eingegebenen Betrag negativ, z. B. für eine
 * bereits berechnete Abschlagsrechnung, eine Anzahlung oder einen Rabatt.
 * Ein ausdrücklicher Schalter statt eines getippten Minus – die Dezimaltastatur
 * auf dem Handy hat oft keine Minus-Taste.
 */
export function DeductionToggle({ pressed, onChange }: DeductionToggleProps) {
  const t = useTranslations("Deduction");
  return (
    <button
      type="button"
      className="deduction-toggle"
      aria-pressed={pressed}
      data-on={pressed ? "1" : "0"}
      onClick={() => onChange(!pressed)}
    >
      <CircleMinus size={20} strokeWidth={2} className="deduction-toggle-icon" aria-hidden />
      <span className="deduction-toggle-text">
        <span className="deduction-toggle-label">{t("label")}</span>
        <span className="deduction-toggle-hint">{t("hint")}</span>
      </span>
      <span className="deduction-toggle-switch" aria-hidden />
    </button>
  );
}
