"use client";

import { useRef } from "react";
import { Camera, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import type { NachweisScanError } from "./use-nachweis-scan";
import "./nachweis-upload.css";

const STROKE = 1.75;

interface NachweisUploadProps {
  error: NachweisScanError | null;
  onFile: (file: File) => void;
  onManual: () => void;
}

/** Foto aufnehmen oder Datei wählen – ein großer Knopf, Fehler direkt darunter. */
export function NachweisUpload({ error, onFile, onManual }: NachweisUploadProps) {
  const t = useTranslations("Step2");
  const inputRef = useRef<HTMLInputElement>(null);

  function errorText(scanError: NachweisScanError): string {
    switch (scanError.code) {
      case "unsupported_file":
        return t("nachweisErrorUnsupported");
      case "file_too_large":
        return t("nachweisErrorTooLarge");
      case "quota_reached":
        return t("nachweisErrorLimit", { limit: scanError.dailyLimit ?? 10 });
      case "no_hours_found":
        return t("nachweisErrorEmpty");
      default:
        return t("nachweisErrorFailed");
    }
  }

  return (
    <div className="nachweis-upload">
      <button type="button" className="nachweis-upload-drop" onClick={() => inputRef.current?.click()}>
        <span className="nachweis-upload-ic">
          <Camera size={28} strokeWidth={STROKE} aria-hidden />
        </span>
        <span className="nachweis-upload-title">{t("nachweisUploadTitle")}</span>
        <span className="nachweis-upload-hint">{t("nachweisUploadHint")}</span>
      </button>
      <input
        ref={inputRef}
        className="nachweis-upload-input"
        type="file"
        accept="image/*,application/pdf"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onFile(file);
        }}
      />

      {error && (
        <div className="nachweis-upload-error" role="alert">
          <TriangleAlert size={20} strokeWidth={STROKE} aria-hidden />
          <span className="nachweis-upload-error-text">{errorText(error)}</span>
          <button type="button" className="nachweis-upload-manual" onClick={onManual}>
            {t("nachweisManual")}
          </button>
        </div>
      )}
    </div>
  );
}
