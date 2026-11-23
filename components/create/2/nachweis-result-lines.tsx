"use client";

import { FileText } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatAmount, formatMoney } from "@/lib/format";
import { roundHalfAwayFromZero } from "@/lib/money";
import type { NachweisVorschlag } from "@/types/nachweis";
import "./nachweis-result-lines.css";

interface NachweisResultLinesProps {
  vorschlaege: (Omit<NachweisVorschlag, "quelle" | "amount" | "unit"> & {
    amount: number | null;
    unit: string | null;
  })[];
  jeZeile?: boolean;
}

interface NachweisResultRowProps {
  vorschlag: NachweisResultLinesProps["vorschlaege"][number];
  summe: number | null;
  jeZeile: boolean;
}

function NachweisResultRow({ vorschlag, summe, jeZeile }: NachweisResultRowProps) {
  const t = useTranslations("Step2");
  return (
    <li className="nachweis-result-row">
      <div className="nachweis-result-desc" lang="de" dir="ltr">
        {vorschlag.descriptionDe.trim() || "—"}
        {jeZeile && vorschlag.additionalDescriptionDe && (
          <p className="nachweis-result-note">{vorschlag.additionalDescriptionDe}</p>
        )}
      </div>
      <span className="nachweis-result-qty" lang="de" dir="ltr">
        {vorschlag.amount !== null ? formatAmount(vorschlag.amount) : "—"} {vorschlag.unit}
        {vorschlag.unitPrice ? ` × ${formatMoney(vorschlag.unitPrice)}` : ""}
      </span>
      {summe !== null ? (
        <span className="nachweis-result-sum" dir="ltr">{formatMoney(summe)}</span>
      ) : (
        <span className="nachweis-result-missing">
          {t(!vorschlag.unitPrice ? "nachweisPriceMissing" : "nachweisAmountMissing")}
        </span>
      )}
    </li>
  );
}

export function NachweisResultLines({ vorschlaege, jeZeile = false }: NachweisResultLinesProps) {
  const t = useTranslations("Step2");
  if (vorschlaege.length === 0) return null;

  const zeilen = vorschlaege.map((vorschlag) => ({
    vorschlag,
    summe: vorschlag.unitPrice && vorschlag.amount && vorschlag.unit?.trim()
      ? roundHalfAwayFromZero(vorschlag.unitPrice * vorschlag.amount)
      : null,
  }));
  const vollstaendig = zeilen.every((zeile) => zeile.summe !== null);
  const gesamt = zeilen.reduce((sum, zeile) => sum + (zeile.summe ?? 0), 0);
  const zusatz = !jeZeile && vorschlaege.find((vorschlag) => vorschlag.additionalDescriptionDe)?.additionalDescriptionDe;

  return (
    <section className="nachweis-result">
      <h3 className="nachweis-result-title">
        <FileText size={16} strokeWidth={2} aria-hidden />
        {t("nachweisLinesTitle")}
      </h3>
      <ul className="nachweis-result-list">
        {zeilen.map(({ vorschlag, summe }) => (
          <NachweisResultRow key={vorschlag.key} vorschlag={vorschlag} summe={summe} jeZeile={jeZeile} />
        ))}
      </ul>
      {zusatz && <p className="nachweis-result-note" lang="de" dir="ltr">{zusatz}</p>}
      {(vollstaendig && vorschlaege.length > 1 || jeZeile && gesamt > 0) && (
        <div className="nachweis-result-total">
          <span>{t(vollstaendig ? "nachweisTotal" : "nachweisSubtotal")}</span>
          <span dir="ltr">{formatMoney(gesamt)}</span>
        </div>
      )}
    </section>
  );
}
