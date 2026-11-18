"use client";

import { Check, CircleCheck, Info, RotateCcw, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { formatAmount } from "@/lib/format";
import { nachweisZeitraumText } from "@/lib/documents/nachweis-positionen";
import type { KatalogEintrag } from "@/types/service";
import type { NachweisErgebnis, NachweisImportLine } from "@/types/nachweis";
import { NachweisResultLines } from "./nachweis-result-lines";
import { NachweisWorkers } from "./nachweis-workers";
import type { NachweisScanState } from "./use-nachweis-scan";
import "./nachweis-review.css";

const STROKE = 1.9;

interface NachweisReviewProps {
  locale: Locale;
  services: KatalogEintrag[];
  ergebnis: NachweisErgebnis;
  scan: NachweisScanState;
  onImport: (lines: NachweisImportLine[]) => void;
}

interface CheckBannerProps {
  ergebnis: NachweisErgebnis;
}

/** Ergebnis unserer Summenprüfung gegen die handschriftliche Gesamtzeile. */
function CheckBanner({ ergebnis }: CheckBannerProps) {
  const t = useTranslations("Step2");
  const { pruefung } = ergebnis;
  const hours = formatAmount(pruefung.gesamt);
  if (pruefung.ok) {
    return (
      <div className="nachweis-check" data-tone="ok" role="status">
        <CircleCheck size={20} strokeWidth={STROKE} aria-hidden />
        <span>{t("nachweisCheckOk", { hours })}</span>
      </div>
    );
  }
  if (!pruefung.vergleichbar) {
    return (
      <div className="nachweis-check" data-tone="info" role="status">
        <Info size={20} strokeWidth={STROKE} aria-hidden />
        <span>{t("nachweisCheckNone", { hours })}</span>
      </div>
    );
  }
  return (
    <div className="nachweis-check" data-tone="warn" role="alert">
      <TriangleAlert size={20} strokeWidth={STROKE} aria-hidden />
      <span>
        {t("nachweisCheckMismatch", {
          hours,
          sheet: formatAmount(pruefung.gesamtLautBlatt || pruefung.tage.reduce((sum, tag) => sum + tag.lautBlatt, 0)),
        })}
      </span>
    </div>
  );
}

/** Prüfschritt: Kontrolle gegen das Blatt, Stundensatz je Mitarbeiter, Positionen bestätigen. */
export function NachweisReview({ locale, services, ergebnis, scan, onImport }: NachweisReviewProps) {
  const t = useTranslations("Step2");
  const zeitraum = nachweisZeitraumText(ergebnis.zeitraumVon, ergebnis.zeitraumBis);
  const { lines, vollstaendig } = scan.importZeilen;
  const hatNotizen = ergebnis.bemerkungen.length > 0 || ergebnis.hinweise.length > 0;

  return (
    <div className="nachweis-review">
      <div className="nachweis-review-head">
        <span className="nachweis-review-number">
          {ergebnis.nummer
            ? t("nachweisNumber", { number: ergebnis.nummer })
            : t("nachweisNoNumber")}
        </span>
        {(ergebnis.projekt || zeitraum) && (
          <span className="nachweis-review-meta" lang="de" dir="ltr">
            {[ergebnis.projekt, zeitraum].filter(Boolean).join(" · ")}
          </span>
        )}
      </div>

      <CheckBanner ergebnis={ergebnis} />

      {ergebnis.mitarbeiter.length > 0 && (
        <NachweisWorkers
          locale={locale}
          mitarbeiter={ergebnis.mitarbeiter}
          zuordnung={scan.zuordnung}
          services={services}
          onRate={scan.setRate}
          onRateForAll={scan.setRateForAll}
        />
      )}

      <NachweisResultLines
        vorschlaege={scan.vorschlaege}
        korrekturen={scan.korrekturen}
        onAmount={scan.setAmount}
        onPrice={scan.setPrice}
        onToggle={scan.toggle}
      />

      {hatNotizen && (
        <details className="nachweis-review-notes">
          <summary>{t("nachweisNotesTitle")}</summary>
          {ergebnis.bemerkungen && (
            <p className="nachweis-review-remark" lang="de" dir="ltr">{ergebnis.bemerkungen}</p>
          )}
          {ergebnis.hinweise.length > 0 && (
            <ul className="nachweis-review-hints" lang="de" dir="ltr">
              {ergebnis.hinweise.map((hinweis) => <li key={hinweis}>{hinweis}</li>)}
            </ul>
          )}
        </details>
      )}

      <div className="nachweis-review-foot">
        <button type="button" className="nachweis-review-again" onClick={scan.reset}>
          <RotateCcw size={17} strokeWidth={STROKE} aria-hidden />
          {t("nachweisOtherFile")}
        </button>
        <button
          type="button"
          className="nachweis-review-import"
          disabled={!vollstaendig}
          onClick={() => onImport(lines)}
        >
          <Check size={20} strokeWidth={2.4} aria-hidden />
          {t("nachweisImport", { count: lines.length })}
        </button>
      </div>
    </div>
  );
}
