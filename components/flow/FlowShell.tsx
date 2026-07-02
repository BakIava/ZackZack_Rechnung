"use client";

import type { ReactNode } from "react";
import { Fragment } from "react";
import { useSelectedLayoutSegment } from "next/navigation";
import { useTranslations } from "next-intl";
import { FLOW_STEPS, FLOW_TOTAL } from "@/lib/flow/config";
import "./FlowShell.css";

const STEP_LABEL_KEYS = ["step1", "step2", "step3"] as const;

interface FlowShellProps {
  dir: "ltr" | "rtl";
  fontClasses: string;
  children: ReactNode;
}

export function FlowShell({ dir, fontClasses, children }: FlowShellProps) {
  const t = useTranslations("Create");
  const segment = useSelectedLayoutSegment();
  const stepIndex = FLOW_STEPS.indexOf(
    segment as (typeof FLOW_STEPS)[number],
  );
  const currentStep = stepIndex >= 0 ? stepIndex + 1 : 1;

  return (
    <div className={`${fontClasses} flow-scope`}>
      <div className="flow-wrap" dir={dir}>
        <nav
          className="flow-progress"
          aria-label={`Schritt ${currentStep} von ${FLOW_TOTAL}`}
        >
          {FLOW_STEPS.map((_, i) => {
            const num = i + 1;
            const isActive = num === currentStep;
            const isDone = num < currentStep;
            return (
              <Fragment key={num}>
                {i > 0 && (
                  <span
                    className={`flow-step-line${isDone ? " flow-step-line--done" : ""}`}
                    aria-hidden
                  />
                )}
                <div
                  className={`flow-step${isActive ? " flow-step--active" : ""}${isDone ? " flow-step--done" : ""}`}
                  aria-current={isActive ? "step" : undefined}
                >
                  <span className="flow-step-dot">{num}</span>
                  <span className="flow-step-lbl">
                    {t(STEP_LABEL_KEYS[i])}
                  </span>
                </div>
              </Fragment>
            );
          })}
        </nav>
        {children}
      </div>
    </div>
  );
}
