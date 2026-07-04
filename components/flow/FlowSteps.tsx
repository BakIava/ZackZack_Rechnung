import { Fragment } from "react";
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { FLOW_STEPS } from "@/lib/flow/steps";

interface FlowStepsProps {
  /** Aktueller Schritt (1-basiert). Kleinere Schritte gelten als erledigt. */
  current: number;
}

/**
 * Schritt-Indikator (1 · 2 · 3) für den Draft-Flow, zentral aus FLOW_STEPS
 * gespeist. Erledigte Schritte zeigen einen Haken, der aktive ist hervorgehoben.
 * Nutzt die bestehenden `.dsteps2`/`.dstep2`-Klassen – Darstellung unverändert.
 */
export function FlowSteps({ current }: FlowStepsProps) {
  const t = useTranslations("Create");

  return (
    <div className="dsteps2">
      {FLOW_STEPS.map((s, i) => (
        <Fragment key={s.step}>
          {i > 0 && (
            <span
              className={`dstep2-line${
                FLOW_STEPS[i - 1].step < current ? " dstep2-line--done" : ""
              }`}
              aria-hidden
            />
          )}
          <div className={`dstep2${s.step === current ? " dstep2--active" : ""}`}>
            <span
              className={`dstep2-dot${
                s.step < current ? " dstep2-dot--done" : ""
              }`}
            >
              {s.step < current ? (
                <Check size={15} strokeWidth={2.5} color="#fff" aria-hidden />
              ) : (
                s.step
              )}
            </span>
            <span className="dstep2-lbl">{t(s.labelKey)}</span>
          </div>
        </Fragment>
      ))}
    </div>
  );
}
