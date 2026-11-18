"use client";

import { Check, History, RefreshCw, RotateCcw, TriangleAlert } from "lucide-react";
import { useId } from "react";
import { useTranslations } from "next-intl";
import { formatAmount } from "@/lib/format";
import { MAX_NACHWEIS_DESCRIPTION } from "@/lib/documents/nachweis-import";
import { NACHWEIS_STUNDEN_TEXT, nachweisZeitraumText } from "@/lib/documents/nachweis-positionen";
import { nachweisBlattGesamt, stimmtMitBlatt } from "@/lib/documents/nachweis-pruefung";
import type { NachweisErgebnis, NachweisImportLine, NachweisVerwendung } from "@/types/nachweis";
import { NachweisMaterial } from "./nachweis-material";
import { NachweisResultLines } from "./nachweis-result-lines";
import { NachweisWorkers } from "./nachweis-workers";
import type { NachweisScanState } from "./use-nachweis-scan";
import "./nachweis-review.css";

const STROKE = 1.9;

interface CheckBannerProps {
  ergebnis: NachweisErgebnis;
  gesamtStunden: number;
}

/** Warnt nur, wenn die (korrigierten) Stunden nicht zur Gesamtzeile des Zettels passen. */
function CheckBanner({ ergebnis, gesamtStunden }: CheckBannerProps) {
  const t = useTranslations("Step2");
  if (stimmtMitBlatt(ergebnis.pruefung, gesamtStunden) !== false) return null;

  return (
    <div className="nachweis-check" role="status">
      <TriangleAlert size={20} strokeWidth={STROKE} aria-hidden />
      <span>
        {t("nachweisCheckMismatch", {
          hours: formatAmount(gesamtStunden),
          sheet: formatAmount(nachweisBlattGesamt(ergebnis.pruefung) ?? 0),
        })}
      </span>
    </div>
  );
}

interface UsedBannerProps {
  nummer: string;
  verwendungen: NachweisVerwendung[];
}

/** Warnung vor Doppelabrechnung: dieselbe Nachweis-Nummer steht schon auf einem Dokument. */
function UsedBanner({ nummer, verwendungen }: UsedBannerProps) {
  const t = useTranslations("Step2");
  if (verwendungen.length === 0) return null;
  const documents = verwendungen
    .map((verwendung) =>
      verwendung.sameDocument
        ? t("nachweisUsedHere")
        : `${t(verwendung.docType)} ${verwendung.documentNumber ?? t("nachweisUsedDraft")}`,
    )
    .join(", ");

  return (
    <div className="nachweis-check" role="alert">
      <TriangleAlert size={20} strokeWidth={STROKE} aria-hidden />
      <span>{t("nachweisAlreadyUsed", { number: nummer, documents })}</span>
    </div>
  );
}

interface NachweisReviewProps {
  ergebnis: NachweisErgebnis;
  scan: NachweisScanState;
  onImport: (lines: NachweisImportLine[]) => void;
}

/** Prüfschritt wie das Papierblatt: Text, Namen, Stunden, Preise korrigieren → übernehmen. */
export function NachweisReview({ ergebnis, scan, onImport }: NachweisReviewProps) {
  const t = useTranslations("Step2");
  const textId = useId();
  const zeitraum = nachweisZeitraumText(ergebnis.zeitraumVon, ergebnis.zeitraumBis);
  const { lines, vollstaendig } = scan.importZeilen;

  return (
    <div className="nachweis-review">
      <div className="nachweis-review-head">
        <span className="nachweis-review-number">
          {ergebnis.nummer ? t("nachweisNumber", { number: ergebnis.nummer }) : t("nachweisNoNumber")}
        </span>
        {zeitraum && <span className="nachweis-review-meta" dir="ltr">{zeitraum}</span>}
      </div>

      {scan.ausSpeicher && (
        <div className="nachweis-review-cached">
          <History size={17} strokeWidth={STROKE} aria-hidden />
          <span>{t("nachweisFromCache")}</span>
          <button type="button" className="nachweis-review-reread" onClick={scan.neuLesen}>
            <RefreshCw size={16} strokeWidth={STROKE} aria-hidden />
            {t("nachweisReread")}
          </button>
        </div>
      )}

      <UsedBanner nummer={ergebnis.nummer} verwendungen={scan.verwendungen} />
      <CheckBanner ergebnis={ergebnis} gesamtStunden={scan.gesamtStunden} />

      <div className="nachweis-review-text">
        <label htmlFor={textId}>{t("nachweisTextLabel")}</label>
        <input
          id={textId}
          lang="de"
          dir="ltr"
          maxLength={MAX_NACHWEIS_DESCRIPTION}
          value={scan.beschreibung}
          placeholder={NACHWEIS_STUNDEN_TEXT}
          onChange={(event) => scan.setBeschreibung(event.target.value)}
        />
      </div>

      <NachweisWorkers scan={scan} />
      {scan.material.length > 0 && <NachweisMaterial scan={scan} />}
      <NachweisResultLines vorschlaege={scan.vorschlaege} />

      <div className="nachweis-review-foot">
        <button type="button" className="nachweis-review-again" onClick={scan.reset}>
          <RotateCcw size={17} strokeWidth={STROKE} aria-hidden />
          {t("nachweisOtherFile")}
        </button>
        <button
          type="button"
          className="nachweis-review-import"
          disabled={!vollstaendig}
          onClick={() => {
            scan.mitarbeiterFuerNaechstesMalMerken();
            onImport(lines);
          }}
        >
          <Check size={20} strokeWidth={2.4} aria-hidden />
          {t("nachweisImport")}
        </button>
      </div>
    </div>
  );
}
