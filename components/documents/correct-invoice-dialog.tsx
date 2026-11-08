"use client";

import { useEffect, useRef } from "react";
import { FilePenLine, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import "./correct-invoice-dialog.css";

interface CorrectInvoiceDialogProps {
  documentNumber: string;
  pending: boolean;
  failed: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const STROKE = 1.75;

/**
 * Bestätigung vor „Rechnung korrigieren". Weist darauf hin, dass die Nummer
 * bleibt und die alte Fassung ersetzt wird — wer sie schon verschickt hat,
 * bewahrt sie selbst auf. Escape/Backdrop brechen ab; der Fokus startet auf
 * „Abbrechen", weil Bestätigen die alte Fassung ersetzt.
 */
export function CorrectInvoiceDialog({
  documentNumber,
  pending,
  failed,
  onConfirm,
  onCancel,
}: CorrectInvoiceDialogProps) {
  const t = useTranslations("Documents");
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !pending) onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel, pending]);

  return (
    <div
      className="cinv-overlay"
      role="presentation"
      onClick={() => {
        if (!pending) onCancel();
      }}
    >
      <div
        className="cinv-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cinv-title"
        aria-describedby="cinv-body"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="cinv-icon">
          <FilePenLine size={22} strokeWidth={STROKE} aria-hidden />
        </span>
        <div id="cinv-title" className="cinv-title">
          {t("correctTitle")}
        </div>
        <div className="cinv-number" dir="ltr">
          {documentNumber}
        </div>
        <p id="cinv-body" className="cinv-body">
          {t("correctBody")}
        </p>
        <div className="cinv-warning">
          <TriangleAlert size={17} strokeWidth={2} aria-hidden />
          <span>{t("correctWarning")}</span>
        </div>
        {failed && (
          <div className="cinv-error" role="alert">
            {t("correctError")}
          </div>
        )}
        <div className="cinv-actions">
          <button
            ref={cancelRef}
            type="button"
            className="cinv-btn cinv-btn--cancel"
            onClick={onCancel}
            disabled={pending}
          >
            {t("correctCancel")}
          </button>
          <button
            type="button"
            className="cinv-btn cinv-btn--go"
            onClick={onConfirm}
            disabled={pending}
          >
            {pending ? t("correcting") : t("correctConfirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
