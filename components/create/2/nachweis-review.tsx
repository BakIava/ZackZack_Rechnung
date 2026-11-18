"use client";

import { Check, CircleCheck, Info, RotateCcw, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { formatAmount } from "@/lib/format";
import { nachweisZeitraumText } from "@/lib/documents/nachweis-positionen";
import { nachweisBlattGesamt, stimmtMitBlatt } from "@/lib/documents/nachweis-pruefung";
import type { KatalogEintrag } from "@/types/service";
import type { NachweisErgebnis, NachweisImportLine } from "@/types/nachweis";
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

/** Live-Abgleich der (korrigierten) Stunden mit der Gesamtzeile des Blatts. */
function CheckBanner({ ergebnis, gesamtStunden }: CheckBannerProps) {
  const t = useTranslations("Step2");
  const stimmt = stimmtMitBlatt(ergebnis.pruefung, gesamtStunden);
  const hours = formatAmount(gesamtStunden);

  if (stimmt === null) {
    return (
      <div className="nachweis-check" data-tone="info" role="status">
        <Info size={20} strokeWidth={STROKE} aria-hidden />
        <span>{t("nachweisCheckNone", { hours })}</span>
      </div>
    );
  }
  if (stimmt) {
    return (
      <div className="nachweis-check" data-tone="ok" role="status">
        <CircleCheck size={20} strokeWidth={STROKE} aria-hidden />
        <span>{t("nachweisCheckOk", { hours })}</span>
      </div>
    );
  }
  return (
    <div className="nachweis-check" data-tone="warn" role="status">
      <TriangleAlert size={20} strokeWidth={STROKE} aria-hidden />
      <span>
        {t("nachweisCheckMismatch", {
          hours,
          sheet: formatAmount(nachweisBlattGesamt(ergebnis.pruefung) ?? 0),
        })}
      </span>
    </div>
  );
}

interface NachweisReviewProps {
  locale: Locale;
  services: KatalogEintrag[];
  ergebnis: NachweisErgebnis;
  scan: NachweisScanState;
  onImport: (lines: NachweisImportLine[]) => void;
}

/** Prüfschritt wie das Papierblatt: Namen, Stunden, Satz korrigieren → übernehmen. */
export function NachweisReview({ locale, services, ergebnis, scan, onImport }: NachweisReviewProps) {
  const t = useTranslations("Step2");
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

      <CheckBanner ergebnis={ergebnis} gesamtStunden={scan.gesamtStunden} />

      <NachweisWorkers locale={locale} services={services} scan={scan} />
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
          onClick={() => onImport(lines)}
        >
          <Check size={20} strokeWidth={2.4} aria-hidden />
          {t("nachweisImport")}
        </button>
      </div>
    </div>
  );
}
