"use client";

import { Lock, Pencil, Trash2, Truck } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatMoney } from "@/lib/format";
import type { DraftItem } from "@/types/document";
import type { PadField } from "./number-pad";

const STROKE = 1.75;

interface PositionCardProps {
  item: DraftItem;
  index: number;
  disabled: boolean;
  onOpenPad: (item: DraftItem, field: PadField) => void;
  onDelete: (id: string) => void;
}

/** Positionskarte (Variante B): „Menge × Preis = Summe". Menge und Preis werden
 *  per Ziffernblock angepasst; Fremdleistungen zeigen nur den Verkaufspreis +
 *  internen Block (Einkauf/Marge erreichen niemals das Dokument). */
export function PositionCard({ item, index, disabled, onOpenPad, onDelete }: PositionCardProps) {
  const t = useTranslations("Step2");
  const isFremd = item.purchasePrice != null;
  const markupLabel =
    item.surchargeType === "percent"
      ? `${(item.surcharge ?? 0) / 100} %`
      : formatMoney(item.surcharge ?? 0);
  const qtyLabel = String(item.amount).replace(".", ",");

  return (
    <div className="d2card">
      <div className="d2card-top">
        <span className="d2card-num">{index + 1}</span>
        <div className="d2card-main">
          <div className="d2-name">{item.descriptionDe}</div>
          {isFremd && (
            <div className="p2-fremdtag">
              <Truck size={13} strokeWidth={STROKE} aria-hidden />
              {t("subcontract")}
            </div>
          )}
        </div>
        <button
          type="button"
          className="d2card-del"
          disabled={disabled}
          onClick={() => onDelete(item.id)}
          aria-label={t("delete")}
        >
          <Trash2 size={20} strokeWidth={STROKE} aria-hidden />
        </button>
      </div>

      {isFremd ? (
        <>
          <div className="d2card-eq">
            <span className="d2card-unit">{item.unit}</span>
            <div className="d2card-res">
              <span className="d2-sumlbl">{t("lineSum")}</span>
              <div className="d2-sumval">{formatMoney(item.totalAmount)}</div>
            </div>
          </div>
          <div className="d2-intern">
            <span className="d2-intern-h">
              <Lock size={13} strokeWidth={STROKE} aria-hidden />
              {t("internalOnly")}
            </span>
            <span className="d2-intern-i">{t("purchase")}: <b>{formatMoney(item.purchasePrice ?? 0)}</b></span>
            <span className="d2-intern-i">{t("markup")}: <b>{markupLabel}</b></span>
            <span className="d2-intern-i">{t("salePrice")}: <b>{formatMoney(item.unitPrice)}</b></span>
          </div>
        </>
      ) : (
        <div className="d2card-eq">
          <button
            type="button"
            className="d2field"
            disabled={disabled}
            onClick={() => onOpenPad(item, "qty")}
          >
            <span className="d2field-l">
              <Pencil size={12} strokeWidth={STROKE} aria-hidden />
              {t("quantity")}
            </span>
            <span className="d2field-v">{qtyLabel} {item.unit}</span>
          </button>
          <span className="d2op">×</span>
          <button
            type="button"
            className="d2field"
            disabled={disabled}
            onClick={() => onOpenPad(item, "price")}
          >
            <span className="d2field-l">
              <Pencil size={12} strokeWidth={STROKE} aria-hidden />
              {t("price")}
            </span>
            <span className="d2field-v">{formatMoney(item.unitPrice)}</span>
          </button>
          <span className="d2op">=</span>
          <div className="d2card-res">
            <span className="d2-sumlbl">{t("lineSum")}</span>
            <div className="d2-sumval">{formatMoney(item.totalAmount)}</div>
          </div>
        </div>
      )}
    </div>
  );
}
