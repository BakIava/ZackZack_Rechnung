"use client";

import { ChevronDown, Lock, Pencil, Percent, Trash2, Truck } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatMoney, formatPercent } from "@/lib/format";
import { markupPercent } from "@/lib/documents/margin";
import type { DraftItem } from "@/types/document";
import type { PadField } from "./number-pad";

const STROKE = 1.75;

interface PositionCardProps {
  item: DraftItem;
  index: number;
  disabled: boolean;
  /** Persistierte Positionsüberschreibung; `null` = Dokumentstandard. */
  vat: DraftItem["taxRate"] | null;
  /** Beim Draft eingefrorener Dokumentstandard (bei §19: 0 %). */
  companyVat: DraftItem["taxRate"];
  onOpenPad: (item: DraftItem, field: PadField) => void;
  onEditDesc: (item: DraftItem) => void;
  onEditUnit: (item: DraftItem) => void;
  onEditVat: (item: DraftItem) => void;
  onDelete: (id: string) => void;
}

/** Positionskarte (Variante B): „Menge × Preis = Summe". Bezeichnung, Einheit
 *  und MwSt. sind direkt tippbar; Menge und Preis öffnen
 *  den Ziffernblock. Fremdleistungen zeigen den anpassbaren Verkaufspreis
 *  („Kunde zahlt") + internen Block — Einkauf/Marge erreichen nie das Dokument. */
export function PositionCard({
  item,
  index,
  disabled,
  vat,
  companyVat,
  onOpenPad,
  onEditDesc,
  onEditUnit,
  onEditVat,
  onDelete,
}: PositionCardProps) {
  const t = useTranslations("Step2");
  const isFremd = item.purchasePrice != null;
  // Prozentaufschlag exakt aus dem gespeicherten Wert lesen (12,50 % = 1250 bp);
  // bei festem Aufschlag (Verkaufspreis direkt gesetzt) rückgerechnet.
  const markup =
    item.surchargeType === "percent" && item.surcharge != null
      ? item.surcharge / 100
      : markupPercent(item.purchasePrice ?? 0, item.unitPrice);
  const qtyLabel = String(item.amount).replace(".", ",");
  const vatIsDefault = vat == null;
  const vatRate = vat ?? companyVat;

  return (
    <div className="d2card">
      <div className="d2card-top">
        <span className="d2card-num">{index + 1}</span>
        <button
          type="button"
          className="d2title-btn"
          disabled={disabled}
          onClick={() => onEditDesc(item)}
        >
          <span className="d2-name">
            {item.descriptionDe}
            <Pencil size={14} strokeWidth={STROKE} aria-hidden />
          </span>
          {isFremd && (
            <span className="p2-fremdtag">
              <Truck size={13} strokeWidth={STROKE} aria-hidden />
              {t("subcontract")}
            </span>
          )}
        </button>
        <button
          type="button"
          className="d2card-del"
          disabled={disabled}
          onClick={() => onDelete(item.id)}
        >
          <Trash2 size={18} strokeWidth={STROKE} aria-hidden />
          {t("delete")}
        </button>
      </div>

      {isFremd ? (
        <>
          <div className="d2card-eq">
            <button
              type="button"
              className="d2field d2field--wide"
              disabled={disabled}
              onClick={() => onOpenPad(item, "sale")}
            >
              <span className="d2field-l">
                <Pencil size={12} strokeWidth={STROKE} aria-hidden />
                {t("salePrice")} · {t("customerPays")}
              </span>
              <span className="d2field-v">{formatMoney(item.unitPrice)}</span>
            </button>
            <span className="d2op">=</span>
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
            <button
              type="button"
              className="d2-intern-edit"
              disabled={disabled}
              onClick={() => onOpenPad(item, "purchase")}
            >
              <Pencil size={12} strokeWidth={STROKE} aria-hidden />
              {t("purchase")}: <b>{formatMoney(item.purchasePrice ?? 0)}</b>
            </button>
            <button
              type="button"
              className="d2-intern-edit"
              disabled={disabled}
              onClick={() => onOpenPad(item, "markup")}
            >
              <Pencil size={12} strokeWidth={STROKE} aria-hidden />
              {t("markup")}: <b>{formatPercent(markup)} %</b>
            </button>
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
            <span className="d2field-v">{qtyLabel}</span>
          </button>
          <button
            type="button"
            className="d2unit"
            disabled={disabled}
            onClick={() => onEditUnit(item)}
          >
            {item.unit}
            <ChevronDown size={14} strokeWidth={STROKE} aria-hidden />
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

      <div className="d2vatrow">
        <button
          type="button"
          className="d2vat"
          data-def={vatIsDefault ? "1" : "0"}
          disabled={disabled}
          onClick={() => onEditVat(item)}
        >
          <Percent size={13} strokeWidth={STROKE} aria-hidden />
          <span className="d2vat-l">{t("vat")}</span>
          <span className="d2vat-v">
            {vatIsDefault ? t("vatStdOn", { rate: companyVat }) : `${vatRate} %`}
          </span>
          <ChevronDown size={13} strokeWidth={STROKE} aria-hidden />
        </button>
      </div>
    </div>
  );
}
