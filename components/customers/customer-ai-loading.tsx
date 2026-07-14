"use client";

import { Check, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import "./customer-ai-loading.css";

const STEP_KEYS = ["ncAiStepName", "ncAiStepAddress", "ncAiStepContact"] as const;
// Rein kosmetische Fortschrittsanzeige. Ihr Timing steuert niemals den Ablauf;
// der Dialog wechselt weiter, sobald der Server-Request abgeschlossen ist.
const STEP_TIMINGS = [460, 900, 1300];

/**
 * Lade-Phase des „Neuer Kunde"-Dialogs: pulsierender Orb + drei nacheinander
 * abgehakte Schritte. Chrome (.dmodal-body) kommt aus new-customer-modal.css.
 */
export function CustomerAiLoading() {
  const t = useTranslations("Create");
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), STEP_TIMINGS[0]),
      setTimeout(() => setStep(2), STEP_TIMINGS[1]),
      setTimeout(() => setStep(3), STEP_TIMINGS[2]),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

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
