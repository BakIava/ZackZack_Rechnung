"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useTranslations } from "next-intl";
import type { DocumentItem } from "@/types/document";
import { formatMoney } from "@/lib/format";

const STROKE = 1.75;
/** Ab dieser Positionsanzahl wird der Rest hinter "Mehr anzeigen" versteckt. */
const VISIBLE_LIMIT = 5;

interface PositionsListProps {
  items: DocumentItem[];
  totalAmount: number;
}

/**
 * Positionsliste eines Dokuments. Bei mehr als VISIBLE_LIMIT Einträgen wird
 * standardmäßig gekürzt — wichtig bei langen Rechnungen, damit die Detailkarte
 * nicht unbedienbar lang wird. `key={doc.id}` beim Einsatz in DocDetail sorgt
 * dafür, dass der Auf/Zu-Zustand beim Wechsel des Dokuments zurückgesetzt wird.
 */
export function PositionsList({ items, totalAmount }: PositionsListProps) {
  const t = useTranslations("Documents");
  const [expanded, setExpanded] = useState(false);

  const hasMore = items.length > VISIBLE_LIMIT;
  const visibleItems = expanded || !hasMore ? items : items.slice(0, VISIBLE_LIMIT);
  const hiddenCount = items.length - VISIBLE_LIMIT;

  return (
    <div className="hpos">
      {visibleItems.map((item) => (
        <div className="hpos-row" key={item.position}>
          <div className="hpos-row-body">
            <div className="hpos-desc">{item.descriptionDe}</div>
            <div className="hpos-qty">
              {item.amount} {item.unit} · {formatMoney(item.unitPrice)}
            </div>
          </div>
          <div className="hpos-sum">{formatMoney(item.totalAmount)}</div>
        </div>
      ))}

      {hasMore && (
        <button
          type="button"
          className="hpos-more"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? (
            <ChevronUp size={15} strokeWidth={STROKE} />
          ) : (
            <ChevronDown size={15} strokeWidth={STROKE} />
          )}
          {expanded ? t("showLess") : t("showMore", { n: hiddenCount })}
        </button>
      )}

      <div className="hpos-total">
        <span className="hpos-total-l">
          {t("total")} <span className="hpos-total-net">{t("mNet")}</span>
        </span>
        <span className="hpos-total-v">{formatMoney(totalAmount)}</span>
      </div>
    </div>
  );
}
