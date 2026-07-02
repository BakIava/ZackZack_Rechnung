"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Lock, Minus, Pencil, Plus, Trash2, Truck } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatMoney } from "@/lib/format";
import type { DraftItem, ItemPatch } from "@/lib/documents/item-types";
import { PositionEditor } from "./position-editor";

const STROKE = 1.75;

interface PositionRowProps {
  item: DraftItem;
  index: number;
  count: number;
  disabled: boolean;
  onQty: (id: string, delta: number) => void;
  onEdit: (id: string, patch: ItemPatch) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, direction: "up" | "down") => void;
}

/** Desktop-Tabellenzeile einer Position (inkl. internem Fremdleistungs-Block + Editor). */
export function PositionRow({
  item,
  index,
  count,
  disabled,
  onQty,
  onEdit,
  onDelete,
  onMove,
}: PositionRowProps) {
  const t = useTranslations("Step2");
  const [editing, setEditing] = useState(false);
  const isFremd = item.purchasePrice != null;

  const markupLabel =
    item.surchargeType === "percent"
      ? `${(item.surcharge ?? 0) / 100} %`
      : formatMoney(item.surcharge ?? 0);

  return (
    <div className="d2row">
      <div className="d2-rh">
        <button type="button" disabled={index === 0 || disabled} onClick={() => onMove(item.id, "up")} aria-label={t("moveUp")}>
          <ChevronUp size={15} strokeWidth={STROKE} aria-hidden />
        </button>
        <button type="button" disabled={index === count - 1 || disabled} onClick={() => onMove(item.id, "down")} aria-label={t("moveDown")}>
          <ChevronDown size={15} strokeWidth={STROKE} aria-hidden />
        </button>
      </div>

      <div className="d2-namecell">
        <div className="d2-name">{item.descriptionDe}</div>
        {isFremd && (
          <div className="p2-fremdtag">
            <Truck size={13} strokeWidth={STROKE} aria-hidden />
            {t("subcontract")}
          </div>
        )}
      </div>

      <div className="d2-stepper">
        <button type="button" disabled={disabled} onClick={() => onQty(item.id, -1)} aria-label={t("less")}>
          <Minus size={16} strokeWidth={2.4} aria-hidden />
        </button>
        <span className="d2-stepper-v">{item.amount} {item.unit}</span>
        <button type="button" disabled={disabled} onClick={() => onQty(item.id, 1)} aria-label={t("more")}>
          <Plus size={16} strokeWidth={2.4} aria-hidden />
        </button>
      </div>

      <div className="d2-price">{formatMoney(item.unitPrice)}</div>
      <div className="d2-sum">{formatMoney(item.totalAmount)}</div>

      <div className="d2-acts">
        <button type="button" className="d2-iconbtn" disabled={disabled} onClick={() => setEditing((v) => !v)} aria-label={t("edit")} aria-expanded={editing}>
          <Pencil size={16} strokeWidth={STROKE} aria-hidden />
        </button>
        <button type="button" className="d2-iconbtn d2-iconbtn--del" disabled={disabled} onClick={() => onDelete(item.id)} aria-label={t("delete")}>
          <Trash2 size={17} strokeWidth={STROKE} aria-hidden />
        </button>
      </div>

      {isFremd && !editing && (
        <div className="d2-internrow">
          <div className="d2-intern">
            <span className="d2-intern-h">
              <Lock size={14} strokeWidth={STROKE} aria-hidden />
              {t("internalOnly")}
            </span>
            <span className="d2-intern-i">{t("purchase")} ({t("inclVat")}): <b>{formatMoney(item.purchasePrice ?? 0)}</b></span>
            <span className="d2-intern-i">{t("markup")}: <b>{markupLabel}</b></span>
            <span className="d2-intern-i">{t("salePrice")}: <b>{formatMoney(item.unitPrice)}</b></span>
            <span className="d2-intern-i">{t("margin")}: <b>{formatMoney(item.unitPrice - (item.purchasePrice ?? 0))}</b></span>
            <span className="d2-intern-note">
              <Lock size={12} strokeWidth={STROKE} aria-hidden />
              {t("notOnDoc")}
            </span>
          </div>
        </div>
      )}

      {editing && (
        <div className="d2-internrow">
          <PositionEditor
            item={item}
            onSave={(patch) => {
              onEdit(item.id, patch);
              setEditing(false);
            }}
            onCancel={() => setEditing(false)}
          />
        </div>
      )}
    </div>
  );
}
