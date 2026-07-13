"use client";

import { Check, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import "./customer-ai-loading.css";

interface CustomerAiLoadingProps {
  /** Wird aufgerufen, sobald die Erkennungs-Animation durchgelaufen ist. */
  onDone: () => void;
}

const STEP_KEYS = ["ncAiStepName", "ncAiStepAddress", "ncAiStepContact"] as const;
// Getaktete Schritt-Animation (rein kosmetisch); der eigentliche Aufruf läuft
// parallel und wird in onDone abgewartet.
const STEP_TIMINGS = [460, 900, 1300, 1650];

/**
 * Lade-Phase des „Neuer Kunde"-Dialogs: pulsierender Orb + drei nacheinander
 * abgehakte Schritte. Chrome (.dmodal-body) kommt aus new-customer-modal.css.
 */
export function CustomerAiLoading({ onDone }: CustomerAiLoadingProps) {
  const t = useTranslations("Create");
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), STEP_TIMINGS[0]),
      setTimeout(() => setStep(2), STEP_TIMINGS[1]),
      setTimeout(() => setStep(3), STEP_TIMINGS[2]),
      setTimeout(() => onDone(), STEP_TIMINGS[3]),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onDone]);

  return (
    <div className="dmodal-body">
      <div className="ai-load">
        <div className="ai-orb">
          <Sparkles size={30} strokeWidth={2.4} aria-hidden />
        </div>
        <div className="ai-load-t">{t("ncAiLoadTitle")}</div>
        <div className="ai-load-s">{t("ncAiLoadSub")}</div>
        <div className="ai-steps">
          {STEP_KEYS.map((key, i) => (
            <div
              key={key}
              className="ai-step"
              data-state={step > i ? "done" : step === i ? "active" : "wait"}
            >
              <span className="ai-step-dot">
                {step > i ? (
                  <Check size={13} strokeWidth={3} aria-hidden />
                ) : (
                  <span className="ai-spin" />
                )}
              </span>
              {t(key)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
