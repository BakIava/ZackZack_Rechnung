"use client";

import { Check, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import "./ai-intake-loading.css";

interface AiIntakeLoadingProps {
  title: string;
  subtitle: string;
  /** Rein kosmetische Schritte; ihr Timing steuert nie den Ablauf. */
  steps: string[];
}

const STEP_INTERVAL_MS = 440;

/**
 * Phase ② des KI-Erfassungsdialogs: pulsierender Orb + nacheinander abgehakte
 * Schritte. Der Dialog wechselt weiter, sobald der Server-Request fertig ist.
 */
export function AiIntakeLoading({ title, subtitle, steps }: AiIntakeLoadingProps) {
  const [done, setDone] = useState(0);
  const stepCount = steps.length;

  useEffect(() => {
    const timers = Array.from({ length: stepCount }, (_, index) =>
      setTimeout(() => setDone(index + 1), STEP_INTERVAL_MS * (index + 1)),
    );
    return () => timers.forEach(clearTimeout);
  }, [stepCount]);

  return (
    <div className="ai-intake-loading" role="status" aria-live="polite">
      <div className="ai-intake-loading-orb">
        <Sparkles size={30} strokeWidth={2.4} aria-hidden />
      </div>
      <div className="ai-intake-loading-title">{title}</div>
      <div className="ai-intake-loading-sub">{subtitle}</div>
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
