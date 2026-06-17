import type { CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import "./step-header.css";

interface StepHeaderProps {
  step: number;
  total: number;
  title: string;
  className?: string;
}

/** Schritt-Kopf mit Fortschritt (1/2/3) für den geführten Flow. RTL-fest. */
export function StepHeader({ step, total, title, className }: StepHeaderProps) {
  const t = useTranslations("StepHeader");
  const progress = Math.min(Math.max(step / total, 0), 1);
  // Only a data value is passed via the style attribute; presentation lives in CSS.
  const trackStyle = { "--step-progress": progress } as CSSProperties;

  return (
    <header className={cn("flex flex-col gap-2", className)}>
      <p className="text-sm text-muted-foreground">
        {t("progress", { step, total })}
      </p>
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <div
        className="step-header__track"
        role="progressbar"
        aria-valuenow={step}
        aria-valuemin={1}
        aria-valuemax={total}
        style={trackStyle}
      >
        <div className="step-header__fill" />
      </div>
    </header>
  );
}
