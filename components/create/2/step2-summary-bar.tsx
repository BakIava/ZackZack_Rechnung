"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatMoney } from "@/lib/format";
import type { DocumentTotals } from "@/types/document";
import "./step2-summary-bar.css";

interface Step2SummaryBarProps {
  dir: "ltr" | "rtl";
  itemCount: number;
  totals: DocumentTotals;
  showTaxDetails: boolean;
  pending: boolean;
  onNext: () => void;
}

/**
 * Summenleiste am Ende der Positionsspalte: Endbetrag und „Weiter" bleiben auch
 * bei langen Listen sichtbar, die Dokumentvorschau behält ihre volle Höhe. Die
 * Steueraufschlüsselung je Satz steht im Dokument – hier nur die enthaltene MwSt.
 */
export function Step2SummaryBar({
  dir,
  itemCount,
  totals,
  showTaxDetails,
  pending,
  onNext,
}: Step2SummaryBarProps) {
  const t = useTranslations("Step2");
  const Forward = dir === "rtl" ? ChevronLeft : ChevronRight;

  return (
    <div className="d2-foot" role="region" aria-label={t("summary")} data-testid="step2-summary-bar">
      <div className="d2-foot-sum">
        <span className="d2-foot-label">{t(showTaxDetails ? "grossTotal" : "netSub")}</span>
        <span className="d2-foot-line">
          <span className="d2-foot-amount" data-testid="step2-summary-total">
            {formatMoney(showTaxDetails ? totals.grossAmount : totals.netAmount)}
          </span>
          {showTaxDetails && (
            <span className="d2-foot-vat">
              {t("vatIncluded", { amount: formatMoney(totals.taxAmount) })}
            </span>
          )}
        </span>
      </div>
      <button
        type="button"
        className="d2-foot-next"
        disabled={itemCount === 0 || pending}
        onClick={onNext}
      >
        {t("next")}
        <Forward size={20} strokeWidth={2.4} aria-hidden />
      </button>
    </div>
  );
}
