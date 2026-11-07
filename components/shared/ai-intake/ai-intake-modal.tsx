"use client";

import { Check, Loader2, Sparkles, X, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState, type FormEvent, type ReactNode } from "react";
import { Modal } from "@/components/ui";
import type { AiIntakeOutcome } from "@/types/ai-intake";
import { AiIntakeInput } from "./ai-intake-input";
import { AiIntakeLoading } from "./ai-intake-loading";
import { AiIntakeNotice, type AiIntakeSource } from "./ai-intake-notice";
import "./ai-intake-modal.css";

/** Fachspezifische, bereits übersetzte Texte des Dialogs. */
export interface AiIntakeTexts {
  lead: string;
  placeholder: string;
  loadingSubtitle: string;
  /** Rein kosmetische Ladeschritte. */
  loadingSteps: string[];
  /** Hinweis über dem Formular, wenn ohne KI erfasst wird. */
  manualHint: string;
}

interface AiIntakeModalProps {
  dir: "ltr" | "rtl";
  icon: LucideIcon;
  title: string;
  /** Untertitel in der Formular-Phase (z. B. beim Bearbeiten). */
  subtitle?: string;
  /** Bearbeiten: direkt ins vorbefüllte Formular, ohne KI-Hinweis. */
  startInForm?: boolean;
  texts: AiIntakeTexts;
  maxInputLength?: number;
  /** Ruft die KI auf, übernimmt erkannte Werte in die eigenen Felder und meldet das Ergebnis. */
  onExtract: (text: string) => Promise<AiIntakeOutcome>;
  canSubmit: boolean;
  saving: boolean;
  error: string | null;
  submitLabel: string;
  savingLabel?: string;
  onSubmit: () => void;
  onClose: () => void;
  /** Die fachspezifischen Formularfelder. */
  children: ReactNode;
}

type Phase = "input" | "loading" | "form";

/**
 * Gemeinsamer KI-Erfassungsdialog (Neuer Kunde, Einsatzort):
 * ① Freitext → ② KI erkennt Felder → ③ Formular prüfen und speichern.
 * Kennt keine Fachdaten – Felder, Pflichtregel und Speichern liefert der Aufrufer.
 */
export function AiIntakeModal({
  dir,
  icon: Icon,
  title,
  subtitle,
  startInForm = false,
  texts,
  maxInputLength,
  onExtract,
  canSubmit,
  saving,
  error,
  submitLabel,
  savingLabel,
  onSubmit,
  onClose,
  children,
}: AiIntakeModalProps) {
  const t = useTranslations("AiIntake");
  const titleId = useId();
  const [phase, setPhase] = useState<Phase>(startInForm ? "form" : "input");
  const [source, setSource] = useState<AiIntakeSource>(startInForm ? "edit" : "manual");
  const [text, setText] = useState("");
  const [extractedText, setExtractedText] = useState("");
  const [limit, setLimit] = useState<number | null>(null);
  const busy = phase === "loading" || saving;

  async function fill() {
    const input = text.trim();
    if (!input) return;
    setPhase("loading");
    let outcome: AiIntakeOutcome;
    try {
      outcome = await onExtract(input);
    } catch {
      // Netzwerk-/Action-Fehler öffnen sicher das manuelle Formular.
      outcome = { kind: "fail" };
    }
    setSource(outcome.kind);
    setLimit(outcome.kind === "limit" ? outcome.limit : null);
    setExtractedText(input);
    setPhase("form");
  }

  function goManual() {
    setSource("manual");
    setPhase("form");
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (canSubmit && !saving) onSubmit();
  }

  return (
    // Kein Schließen per Klick daneben – sonst gehen Eingaben versehentlich verloren.
    <Modal open dir={dir} onClose={onClose} busy={busy} labelledBy={titleId}
      size="lg" className="ai-intake" closeOnBackdrop={false}>
      <div className="ai-intake-head">
        <h2 id={titleId} className="ai-intake-title">
          <Icon size={20} strokeWidth={1.9} className="ai-intake-title-icon" aria-hidden />
          <span className="ai-intake-title-text">{title}</span>
          {(phase === "loading" || source === "ok") && (
            <Sparkles size={15} strokeWidth={2.6} className="ai-intake-title-spark" aria-hidden />
          )}
        </h2>
        <button type="button" className="ai-intake-close" aria-label={t("close")}
          disabled={busy} onClick={onClose}>
          <X size={20} strokeWidth={1.75} aria-hidden />
        </button>
      </div>

      {phase === "input" && (
        <div className="ai-intake-frame">
          <div className="ai-intake-body">
            <AiIntakeInput lead={texts.lead} placeholder={texts.placeholder} value={text}
              maxLength={maxInputLength} onChange={setText} />
          </div>
          <div className="ai-intake-foot ai-intake-foot--input">
            <button type="button" className="ai-intake-manual" onClick={goManual}>
              {t("manual")}
            </button>
            <button type="button" className="ai-intake-fill" disabled={!text.trim()}
              onClick={() => void fill()}>
              <Sparkles size={18} strokeWidth={2.4} aria-hidden />
              {t("fill")}
            </button>
          </div>
        </div>
      )}

      {phase === "loading" && (
        <div className="ai-intake-body">
          <AiIntakeLoading title={t("loadingTitle")} subtitle={texts.loadingSubtitle}
            steps={texts.loadingSteps} />
        </div>
      )}

      {phase === "form" && (
        <form className="ai-intake-frame" onSubmit={submit} noValidate>
          <div className="ai-intake-body">
            {subtitle && <p className="ai-intake-sub">{subtitle}</p>}
            <AiIntakeNotice source={source} limit={limit} manualHint={texts.manualHint}
              sourceText={extractedText} onChangeInput={() => setPhase("input")} />
            {children}
            {error && <p className="ai-intake-error" role="alert">{error}</p>}
          </div>
          <div className="ai-intake-foot">
            <button type="button" className="ai-intake-cancel" disabled={saving} onClick={onClose}>
              {t("cancel")}
            </button>
            <button type="submit" className="ai-intake-submit" disabled={!canSubmit || saving}>
              {saving ? (
                <Loader2 size={20} strokeWidth={2.4} className="ai-intake-spin" aria-hidden />
              ) : (
                <Check size={20} strokeWidth={2.4} aria-hidden />
              )}
              {saving && savingLabel ? savingLabel : submitLabel}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
