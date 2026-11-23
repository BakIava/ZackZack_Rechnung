"use client";

import { AlignLeft, Check, ChevronDown, Truck } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatMoney } from "@/lib/format";
import type { DraftItem, TaxRate } from "@/types/document";
import { PositionNumber } from "./position-number";
import "./position-row.css";

const STROKE = 1.75;

interface PositionRowProps {
  item: DraftItem;
  index: number;
  disabled: boolean;
  /** Positionsüberschreibung der MwSt.; `null` = Dokumentstandard. */
  vat: TaxRate | null;
  onActivate: (id: string) => void;
  selected?: boolean;
  onMoveTo?: ((item: DraftItem) => void) | null;
}

/**
 * Zugeklappte Position: eine Zeile mit Nummer, Bezeichnung, Menge × Preis und
 * Summe. Antippen klappt sie zum Bearbeiten auf. Einkauf und Marge einer
 * Fremdleistung erscheinen hier nie – nur der Verkaufspreis.
 */
export function PositionRow({ item, index, disabled, vat, onActivate, selected, onMoveTo }: PositionRowProps) {
  const t = useTranslations("Step2");
  const isFremd = item.purchasePrice != null;
  const hasDescription = Boolean(item.additionalDescriptionDe?.trim());
  const quantity = String(item.amount).replace(".", ",");

  return (
    <div className="d2row">
      <PositionNumber item={item} index={index} disabled={disabled} onMoveTo={onMoveTo} />
      <button
        type="button"
        className="d2row-toggle"
        aria-expanded={selected === undefined ? false : undefined}
        aria-pressed={selected}
        disabled={disabled}
        onClick={() => onActivate(item.id)}
      >
        <span className="d2row-main">
          <span className="d2row-title">
            <span className="d2row-name" data-testid="position-name">{item.descriptionDe}</span>
            {isFremd && (
              <span className="d2row-icon" title={t("subcontract")}>
                <Truck size={14} strokeWidth={STROKE} aria-hidden />
                <span className="sr-only">{t("subcontract")}</span>
              </span>
            )}
            {vat !== null && <span className="d2row-chip" dir="ltr">{vat} %</span>}
            {hasDescription && (
              <span className="d2row-icon" title={t("hasAdditionalDescription")}>
                <AlignLeft size={14} strokeWidth={STROKE} aria-hidden />
                <span className="sr-only">{t("hasAdditionalDescription")}</span>
              </span>
            )}
          </span>
          {/* Rechenzeile immer links-nach-rechts, sonst verwürfelt RTL „1 m² × 25,00 €". */}
          <span className="d2row-calc" dir="ltr">
            {quantity} {item.unit} × {formatMoney(item.unitPrice)}
          </span>
        </span>
        <span className="d2row-sum" dir="ltr">{formatMoney(item.totalAmount)}</span>
        {selected === undefined ? (
          <ChevronDown size={20} strokeWidth={2} className="d2row-chevron" aria-hidden />
        ) : (
          <span className="d2row-selection" data-selected={selected} aria-hidden>
            {selected && <Check size={15} strokeWidth={2.4} />}
          </span>
        )}
      </button>
    </div>
  );
}
