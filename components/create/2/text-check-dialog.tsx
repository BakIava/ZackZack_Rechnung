"use client";

import { useId, useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button, Modal } from "@/components/ui";
import { MAX_TEXT_CHECK_POSITIONEN } from "@/lib/documents/text-check";
import type {
  TextAenderung,
  TextPruefungResult,
  TextPruefungVorschlag,
  TextUebernahme,
  TextUebernahmeError,
} from "@/types/text-improve";
import "./text-check-dialog.css";

interface TextCheckDialogProps {
  dir: "ltr" | "rtl";
  /** null = Prüfung läuft noch. */
  result: TextPruefungResult | null;
  applying: boolean;
  applyError: TextUebernahmeError | null;
  onClose: () => void;
  onApply: (aenderungen: TextUebernahme[]) => void;
}

type HinweisKey = "allGood" | "noPositions" | "limit" | "checkFailed";

function hinweisKey(result: Exclude<TextPruefungResult, { status: "vorschlaege" }>): HinweisKey {
  if (result.status === "alles_gut") return "allGood";
  if (result.status === "keine_positionen") return "noPositions";
  if (result.status === "limit") return "limit";
  return "checkFailed";
}

function uebernahme(vorschlag: TextPruefungVorschlag): TextUebernahme {
  return {
    itemId: vorschlag.itemId,
    ...(vorschlag.bezeichnung && { descriptionDe: vorschlag.bezeichnung.neu }),
    ...(vorschlag.zusatztext && { additionalDescriptionDe: vorschlag.zusatztext.neu }),
  };
}

/** Ergebnis von „Texte prüfen“: nur geänderte Positionen, jede mit Häkchen (standardmäßig an). */
export function TextCheckDialog({ dir, result, applying, applyError, onClose, onApply }: TextCheckDialogProps) {
  const t = useTranslations("TextImprove");
  const titleId = useId();
  const [abgewaehlt, setAbgewaehlt] = useState<ReadonlySet<string>>(() => new Set());
  const vorschlaege = result?.status === "vorschlaege" ? result.vorschlaege : [];
  const gewaehlt = vorschlaege.filter((vorschlag) => !abgewaehlt.has(vorschlag.itemId));
  const uebersprungen = result?.status === "vorschlaege" || result?.status === "alles_gut" ? result.uebersprungen : 0;

  function toggle(itemId: string) {
    setAbgewaehlt((current) => {
      const next = new Set(current);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }

  return (
    <Modal open onClose={onClose} dir={dir} size="md" busy={applying} labelledBy={titleId}>
      <div className="text-check-dialog">
        <h2 id={titleId}>{t("checkAll")}</h2>

        {result === null && (
          <p className="text-check-dialog-status" role="status">
            <Loader2 size={20} strokeWidth={2} className="text-check-dialog-spin" aria-hidden />
            {t("checking")}
          </p>
        )}
        {result && result.status !== "vorschlaege" && (
          <p className="text-check-dialog-status" role="status">
            {t(hinweisKey(result), { limit: result.status === "limit" ? result.dailyLimit : 0 })}
          </p>
        )}
        {result?.status === "vorschlaege" && (
          <>
            <div className="text-check-dialog-summary">
              <p className="text-check-dialog-count">{t("checkCount", { count: vorschlaege.length })}</p>
              <p className="text-check-dialog-intro">{t("checkHint")}</p>
            </div>
            <ul className="text-check-dialog-list">
              {vorschlaege.map((vorschlag) => (
                <VorschlagZeile
                  key={vorschlag.itemId}
                  vorschlag={vorschlag}
                  checked={!abgewaehlt.has(vorschlag.itemId)}
                  disabled={applying}
                  onToggle={toggle}
                />
              ))}
            </ul>
          </>
        )}
        {uebersprungen > 0 && (
          <p className="text-check-dialog-note">{t("checkSkipped", { max: MAX_TEXT_CHECK_POSITIONEN })}</p>
        )}
        {applyError && (
          <p className="text-check-dialog-error" role="alert">
            {t(applyError === "textsChanged" ? "textsChanged" : "applyFailed")}
          </p>
        )}

        <div className="text-check-dialog-actions">
          {result?.status === "vorschlaege" ? (
            <>
              <Button type="button" variant="outline" disabled={applying} onClick={onClose}>{t("cancel")}</Button>
              <Button
                type="button"
                disabled={applying || applyError === "textsChanged" || gewaehlt.length === 0}
                onClick={() => onApply(gewaehlt.map(uebernahme))}
              >
                {applying ? t("applying") : t("applySelected", { count: gewaehlt.length })}
              </Button>
            </>
          ) : (
            <Button type="button" variant="outline" onClick={onClose}>
              {result === null ? t("cancel") : t("done")}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

interface VorschlagZeileProps {
  vorschlag: TextPruefungVorschlag;
  checked: boolean;
  disabled: boolean;
  onToggle: (itemId: string) => void;
}

function VorschlagZeile({ vorschlag, checked, disabled, onToggle }: VorschlagZeileProps) {
  const t = useTranslations("TextImprove");
  return (
    <li>
      <label className="text-check-row" data-checked={checked}>
        <input type="checkbox" checked={checked} disabled={disabled} onChange={() => onToggle(vorschlag.itemId)} />
        <span className="text-check-row-body">
          <span className="text-check-row-pos">{t("position", { number: vorschlag.position })}</span>
          {vorschlag.bezeichnung && <Aenderung label={t("fieldDescription")} aenderung={vorschlag.bezeichnung} />}
          {vorschlag.zusatztext && <Aenderung label={t("fieldAdditional")} aenderung={vorschlag.zusatztext} />}
        </span>
      </label>
    </li>
  );
}

interface AenderungProps {
  label: string;
  aenderung: TextAenderung;
}

/** Alt und neu untereinander; Dokumenttext bleibt Deutsch und LTR. */
function Aenderung({ label, aenderung }: AenderungProps) {
  const t = useTranslations("TextImprove");
  return (
    <span className="text-check-change">
      <span className="text-check-field">{label}</span>
      <span className="text-check-line">
        <span className="text-check-tag">{t("before")}</span>
        <del className="text-check-old" dir="ltr" lang="de">{aenderung.alt}</del>
      </span>
      <span className="text-check-line">
        <span className="text-check-tag" data-new="true">{t("after")}</span>
        <ins className="text-check-new" dir="ltr" lang="de">{aenderung.neu}</ins>
      </span>
    </span>
  );
}
