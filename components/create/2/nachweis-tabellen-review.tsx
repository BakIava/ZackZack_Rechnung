"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import { MAX_NACHWEIS_DESCRIPTION, MAX_NACHWEIS_IMPORT_LINES } from "@/lib/documents/nachweis-import";
import { NACHWEIS_STUNDEN_TEXT } from "@/lib/documents/nachweis-positionen";
import { nachweisBlattGesamt } from "@/lib/documents/nachweis-pruefung";
import type { NachweisErgebnis } from "@/types/nachweis";
import { NachweisStundenHinweis } from "./nachweis-stunden-hinweis";
import { NachweisMaterial } from "./nachweis-material";
import { NachweisResultLines } from "./nachweis-result-lines";
import { NachweisWorkers } from "./nachweis-workers";
import type { NachweisScanState } from "./use-nachweis-scan";
import "./nachweis-tabellen-review.css";

interface NachweisTabellenReviewProps {
  ergebnis: NachweisErgebnis;
  scan: NachweisScanState;
}

export function NachweisTabellenReview({ ergebnis, scan }: NachweisTabellenReviewProps) {
  const t = useTranslations("Step2");
  const textId = useId();
  return (
    <>
      <NachweisStundenHinweis blatt={nachweisBlattGesamt(ergebnis.pruefung)} stunden={scan.gesamtStunden} />
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
      {scan.vorschlaege.length > MAX_NACHWEIS_IMPORT_LINES && (
        <p role="status">{t("nachweisTooMany", { max: MAX_NACHWEIS_IMPORT_LINES })}</p>
      )}
    </>
  );
}
