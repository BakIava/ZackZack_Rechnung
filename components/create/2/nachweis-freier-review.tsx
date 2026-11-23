"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { freieGesamtStunden, freieNachweisBereitschaft } from "@/lib/documents/nachweis-frei";
import { istNachweisEinzelpreis, MAX_NACHWEIS_IMPORT_LINES, parseNachweisMenge } from "@/lib/documents/nachweis-import";
import type { NachweisReviewDaten } from "@/types/nachweis";
import { NachweisFreieZeile } from "./nachweis-freie-zeile";
import { NachweisResultLines } from "./nachweis-result-lines";
import { NachweisStundenHinweis } from "./nachweis-stunden-hinweis";
import { usePositionExpansion } from "./use-position-expansion";
import type { NachweisScanState } from "./use-nachweis-scan";
import "./nachweis-freier-review.css";

interface NachweisFreierReviewProps {
  review: Extract<NachweisReviewDaten, { variante: "frei" }>;
  scan: NachweisScanState;
  bereitschaft: ReturnType<typeof freieNachweisBereitschaft>;
}

export function NachweisFreierReview({ review, scan, bereitschaft }: NachweisFreierReviewProps) {
  const t = useTranslations("Step2");
  const { expandedId, toggle } = usePositionExpansion(review.zeilen.map((zeile) => zeile.key));
  const vorschlaege = bereitschaft.vorschlaege.map(({ zeile, position, zusatz }) => ({
    key: zeile.key,
    descriptionDe: position?.descriptionDe ?? zeile.descriptionDe,
    amount: position?.amount ?? parseNachweisMenge(zeile.amount),
    unit: position?.unit ?? zeile.unit?.trim() ?? null,
    unitPrice: istNachweisEinzelpreis(zeile.unitPrice) ? zeile.unitPrice : null,
    additionalDescriptionDe: zusatz,
  }));
  return (
    <>
      <NachweisStundenHinweis blatt={review.ergebnis.stundenLautBlatt} stunden={freieGesamtStunden(review.zeilen)} />
      <div className="nachweis-freier-review-zeilen">
        {review.zeilen.map((zeile) => (
          <NachweisFreieZeile
            key={zeile.key}
            zeile={zeile}
            offen={zeile.key === expandedId}
            onToggle={() => toggle(zeile.key)}
            erkannteEinheit={review.ergebnis.leistungen.find((leistung) => leistung.key === zeile.key)?.unit ?? null}
            onChange={(patch) => scan.updateFreieZeile(zeile.key, patch)}
            onRemove={() => scan.removeFreieZeile(zeile.key)} />
        ))}
      </div>
      <button type="button" className="nachweis-freier-review-add" onClick={scan.addFreieZeile}>
        <Plus size={19} aria-hidden /> {t("nachweisAddWork")}
      </button>
      <NachweisResultLines vorschlaege={vorschlaege} jeZeile />
      {bereitschaft.limit && (
        <p className="nachweis-freier-review-hint" role="status">
          {t("nachweisTooMany", { max: MAX_NACHWEIS_IMPORT_LINES })}
        </p>
      )}
      {bereitschaft.vorschlaege.length === 0 && (
        <p className="nachweis-freier-review-hint" role="status">{t("nachweisAddOne")}</p>
      )}
    </>
  );
}
