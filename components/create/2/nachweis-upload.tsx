"use client";

import { useRef } from "react";
import { Camera, History, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { nachweisZeitraumText } from "@/lib/documents/nachweis-positionen";
import type { NachweisCacheEintrag } from "@/types/nachweis";
import type { NachweisScanError } from "./use-nachweis-scan";
import "./nachweis-upload.css";

const STROKE = 1.75;

interface NachweisUploadProps {
  error: NachweisScanError | null;
  /** Zuletzt gelesene Nachweise (nur dieses Gerät) – öffnen ohne neuen KI-Aufruf. */
  zuletzt: NachweisCacheEintrag[];
  onFile: (file: File) => void;
  onOpen: (eintrag: NachweisCacheEintrag) => void;
  onManual: () => void;
}

/** Foto aufnehmen oder Datei wählen – ein großer Knopf, Fehler und letzte Nachweise darunter. */
export function NachweisUpload({ error, zuletzt, onFile, onOpen, onManual }: NachweisUploadProps) {
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
      case "no_work_found":
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

      {zuletzt.length > 0 && (
        <section className="nachweis-upload-recent">
          <h3 className="nachweis-upload-recent-title">{t("nachweisRecentTitle")}</h3>
          {zuletzt.map((eintrag) => (
            <button
              key={eintrag.id}
              type="button"
              className="nachweis-upload-recent-item"
              onClick={() => onOpen(eintrag)}
            >
              <History size={18} strokeWidth={STROKE} aria-hidden />
              <span className="nachweis-upload-recent-name">
                {eintrag.review.ergebnis.nummer
                  ? t("nachweisNumber", { number: eintrag.review.ergebnis.nummer })
                  : t("nachweisNoNumber")}
              </span>
              <span className="nachweis-upload-recent-meta" dir="ltr">
                {eintrag.review.variante === "tabelle" && nachweisZeitraumText(
                  eintrag.review.ergebnis.zeitraumVon, eintrag.review.ergebnis.zeitraumBis,
                )}
              </span>
            </button>
          ))}
        </section>
      )}
    </div>
  );
}
