"use client";

import { AlertTriangle, Check, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import "./ai-intake-notice.css";

/** Woher die Formularwerte stammen – steuert den Hinweis über dem Formular. */
export type AiIntakeSource = "ok" | "fail" | "limit" | "manual" | "edit";

interface AiIntakeNoticeProps {
  source: AiIntakeSource;
  limit: number | null;
  manualHint: string;
  /** Der an die KI gegebene Text – zum Abgleich mit den Feldern. */
  sourceText: string;
  onChangeInput: () => void;
}

export function AiIntakeNotice({
  source,
  limit,
  manualHint,
  sourceText,
  onChangeInput,
}: AiIntakeNoticeProps) {
  const t = useTranslations("AiIntake");
  if (source === "edit") return null;

  const isManual = source === "manual";
  const tone = source === "ok" ? "ok" : isManual ? "muted" : "warn";
  const text = {
    ok: t("okNotice"),
    fail: t("failNotice"),
    limit: t("limitNotice", { limit: limit ?? 0 }),
    manual: manualHint,
  }[source];

  return (
    <>
      <div className={`ai-intake-notice ai-intake-notice--${tone}`} role="status">
        {!isManual && (
          <span className="ai-intake-notice-icon">
            {source === "ok" ? (
              <Check size={16} strokeWidth={3} aria-hidden />
            ) : (
              <AlertTriangle size={16} strokeWidth={2.6} aria-hidden />
            )}
          </span>
        )}
        <span className="ai-intake-notice-text">{text}</span>
        {/* Beim Tageslimit führt kein Weg zurück zur KI. */}
        {source !== "limit" && (
          <button type="button" className="ai-intake-notice-action" onClick={onChangeInput}>
            {isManual && <Sparkles size={13} strokeWidth={2.6} aria-hidden />}
            {isManual ? t("fill") : t("changeInput")}
          </button>
        )}
      </div>
      {!isManual && sourceText && (
        <details className="ai-intake-source">
          <summary>{t("yourInput")}</summary>
          <p dir="auto">{sourceText}</p>
        </details>
      )}
    </>
  );
}
