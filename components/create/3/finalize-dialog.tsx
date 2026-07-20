"use client";

import { useEffect, useRef } from "react";
import { Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import "./finalize-dialog.css";

interface FinalizeDialogProps {
  onConfirm: () => void;
  onCancel: () => void;
  pending: boolean;
  expiredQuote: boolean;
}

const STROKE = 1.75;

/**
 * Bestätigungs-Dialog vor der endgültigen Finalisierung. Weist explizit darauf
 * hin, dass das Dokument danach unveränderbar ist und eine endgültige Nummer
 * erhält. Escape/Backdrop brechen ab; der Bestätigen-Button hat initialen Fokus.
 */
export function FinalizeDialog({
  onConfirm,
  onCancel,
  pending,
  expiredQuote,
}: FinalizeDialogProps) {
  const t = useTranslations("Create");
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !pending) onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel, pending]);

  return (
    <div
      className="fin-overlay"
      role="presentation"
      onClick={() => {
        if (!pending) onCancel();
      }}
    >
      <div
        className="fin-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="fin-title"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="fin-card-ic">
          <Lock size={22} strokeWidth={STROKE} aria-hidden />
        </span>
        <div id="fin-title" className="fin-card-t">
          {t("finalizeConfirmTitle")}
        </div>
        <div className="fin-card-b">{t("finalizeConfirmBody")}</div>
        {expiredQuote && (
          <div className="fin-expired-warning" role="alert">
            {t("finalizeExpiredQuoteWarning")}
          </div>
        )}
        <div className="fin-actions">
          <button
            type="button"
            className="fin-btn fin-btn--cancel"
            onClick={onCancel}
            disabled={pending}
          >
            {t("finalizeConfirmCancel")}
          </button>
          <button
            ref={confirmRef}
            type="button"
            className="fin-btn fin-btn--go"
            onClick={onConfirm}
            disabled={pending}
          >
            {pending ? t("finalizing") : t("finalizeConfirmYes")}
          </button>
        </div>
      </div>
    </div>
  );
}
