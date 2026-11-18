"use client";

import { FileText } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatAmount, formatMoney } from "@/lib/format";
import { roundHalfAwayFromZero } from "@/lib/money";
import type { NachweisVorschlag } from "@/types/nachweis";
import "./nachweis-result-lines.css";

interface NachweisResultLinesProps {
  vorschlaege: NachweisVorschlag[];
}

/** Nur Anzeige: was aufs Dokument kommt – eine Zeile je Stundensatz bzw. Material. */
export function NachweisResultLines({ vorschlaege }: NachweisResultLinesProps) {
  const t = useTranslations("Step2");
  if (vorschlaege.length === 0) return null;

  const zeilen = vorschlaege.map((vorschlag) => ({
    vorschlag,
    summe: vorschlag.unitPrice
      ? roundHalfAwayFromZero(vorschlag.unitPrice * vorschlag.amount)
      : null,
  }));
  const vollstaendig = zeilen.every((zeile) => zeile.summe !== null);
  const gesamt = zeilen.reduce((sum, zeile) => sum + (zeile.summe ?? 0), 0);
  const zusatz = vorschlaege.find((vorschlag) => vorschlag.additionalDescriptionDe)
    ?.additionalDescriptionDe;

  return (
    <section className="nachweis-result">
      <h3 className="nachweis-result-title">
        <FileText size={16} strokeWidth={2} aria-hidden />
        {t("nachweisLinesTitle")}
      </h3>
      <ul className="nachweis-result-list">
        {zeilen.map(({ vorschlag, summe }) => (
          <li key={vorschlag.key} className="nachweis-result-row">
            <span className="nachweis-result-desc" lang="de" dir="ltr">
              {vorschlag.descriptionDe}
            </span>
            <span className="nachweis-result-qty" dir="ltr">
              {`${formatAmount(vorschlag.amount)} ${vorschlag.unit}`}
              {vorschlag.unitPrice ? ` × ${formatMoney(vorschlag.unitPrice)}` : ""}
            </span>
            {summe !== null ? (
              <span className="nachweis-result-sum" dir="ltr">{formatMoney(summe)}</span>
            ) : (
              <span className="nachweis-result-missing">{t("nachweisPriceMissing")}</span>
            )}
          </li>
        ))}
      </ul>
      {zusatz && (
        <p className="nachweis-result-note" lang="de" dir="ltr">{zusatz}</p>
      )}
      {vollstaendig && vorschlaege.length > 1 && (
        <div className="nachweis-result-total">
          <span>{t("nachweisTotal")}</span>
          <span dir="ltr">{formatMoney(gesamt)}</span>
        </div>
      )}
    </section>
  );
}
