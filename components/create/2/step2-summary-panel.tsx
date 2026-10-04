"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatMoney } from "@/lib/format";
import type { DocumentTotals } from "@/types/document";
import "./step2-summary-panel.css";

interface Step2SummaryPanelProps {
  dir: "ltr" | "rtl";
  documentId: string;
  itemCount: number;
  totals: DocumentTotals;
  showTaxDetails: boolean;
  pending: boolean;
  onNext: () => void;
}

export function Step2SummaryPanel({
  dir,
  documentId,
  itemCount,
  totals,
  showTaxDetails,
  pending,
  onNext,
}: Step2SummaryPanelProps) {
  const t = useTranslations("Step2");
  const Forward = dir === "rtl" ? ChevronLeft : ChevronRight;

  return (
    <div className="d2-sumpanel">
      <div className="d2-sum-t">{t("summary")}</div>
      <div className="d2-sum-lines">
        <div className="d2-sum-line"><span>{t("positionsWord")}</span><b>{itemCount}</b></div>
        {showTaxDetails && (
          <div className="d2-sum-line"><span>{t("netSub")}</span><b>{formatMoney(totals.netAmount)}</b></div>
        )}
        {showTaxDetails && totals.taxGroups.map((group) => (
          <div className="d2-sum-line d2-sum-line--vat" key={group.rate}>
            <span>{t("addVat")} {group.rate} %</span>
            <b>{formatMoney(group.taxAmount)}</b>
          </div>
        ))}
      </div>
      <div className="d2-sum-div" />
      <div className="d2-sum-total">
        <span className="d2-sum-total-l">{t(showTaxDetails ? "grossTotal" : "netSub")}</span>
        <span className="d2-sum-total-v">
          {formatMoney(showTaxDetails ? totals.grossAmount : totals.netAmount)}
        </span>
      </div>
      <button
        type="button"
        className="d2-sum-btn"
        disabled={itemCount === 0 || pending}
        onClick={onNext}
      >
        {t("next")}
        <Forward size={20} strokeWidth={2.4} aria-hidden />
      </button>
      <Link href={`/create/${documentId}/1`} className="d2-back">{t("back")}</Link>
    </div>
  );
}
