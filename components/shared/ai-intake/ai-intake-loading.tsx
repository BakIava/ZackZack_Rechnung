"use client";

import { Check, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import "./ai-intake-loading.css";

interface AiIntakeLoadingProps {
  title: string;
  subtitle: string;
  /** Rein kosmetische Schritte; ihr Timing steuert nie den Ablauf. */
  steps: string[];
  /**
   * Zeitpunkt (ms ab Start), zu dem jeder Schritt abgehakt wird. `null` = der
   * Schritt bleibt aktiv, bis das Ergebnis da ist. Ohne Angabe: kurzer Takt
   * für Anfragen, die nur ein, zwei Sekunden dauern.
   */
  stepDoneAtMs?: readonly (number | null)[];
  /** Beruhigender Untertitel, wenn es länger dauert als üblich. */
  slow?: { afterMs: number; subtitle: string };
}

const STEP_INTERVAL_MS = 440;

/**
 * Phase ② des KI-Erfassungsdialogs: pulsierender Orb + nacheinander abgehakte
 * Schritte. Der Dialog wechselt weiter, sobald der Server-Request fertig ist.
 */
export function AiIntakeLoading({ title, subtitle, steps, stepDoneAtMs, slow }: AiIntakeLoadingProps) {
  const [done, setDone] = useState(0);
  const [isSlow, setIsSlow] = useState(false);
  const stepCount = steps.length;
  const slowAfterMs = slow?.afterMs;

  useEffect(() => {
    const timers = Array.from({ length: stepCount }, (_, index) => {
      const at = stepDoneAtMs ? stepDoneAtMs[index] : STEP_INTERVAL_MS * (index + 1);
      return at == null ? null : setTimeout(() => setDone(index + 1), at);
    });
    return () => timers.forEach((timer) => timer !== null && clearTimeout(timer));
  }, [stepCount, stepDoneAtMs]);

  useEffect(() => {
    if (slowAfterMs === undefined) return;
    const timer = setTimeout(() => setIsSlow(true), slowAfterMs);
    return () => clearTimeout(timer);
  }, [slowAfterMs]);

  return (
    <div className="ai-intake-loading" role="status" aria-live="polite">
      <div className="ai-intake-loading-orb">
        <Sparkles size={30} strokeWidth={2.4} aria-hidden />
      </div>
      <div className="ai-intake-loading-title">{title}</div>
      <div className="ai-intake-loading-sub">{isSlow && slow ? slow.subtitle : subtitle}</div>
      {stepCount > 0 && (
        <div className="ai-intake-loading-steps">
          {steps.map((label, index) => (
            <div
              key={label}
              className="ai-intake-loading-step"
              data-state={done > index ? "done" : done === index ? "active" : "wait"}
            >
              <span className="ai-intake-loading-dot">
                {done > index ? (
                  <Check size={13} strokeWidth={3} aria-hidden />
                ) : (
                  <span className="ai-intake-loading-spin" />
                )}
              </span>
              {label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
