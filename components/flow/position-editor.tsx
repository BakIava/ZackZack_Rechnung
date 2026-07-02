"use client";

import { useState } from "react";
import { Check, Lock, Truck, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { computeUnitPrice } from "@/lib/documents/margin";
import type { DraftItem, ItemPatch, SurchargeType } from "@/lib/documents/item-types";
import { formatMoney } from "@/lib/format";
import { eurosToCents } from "@/lib/money";

const STROKE = 1.75;
const centsToEuroStr = (cents: number) => String(cents / 100);

interface PositionEditorProps {
  item: DraftItem;
  onSave: (patch: ItemPatch) => void;
  onCancel: () => void;
}

/** Inline-Editor einer Position: Bezeichnung, Menge, Einheit, Preis + Fremdleistung. */
export function PositionEditor({ item, onSave, onCancel }: PositionEditorProps) {
  const t = useTranslations("Step2");
  const [description, setDescription] = useState(item.descriptionDe);
  const [amount, setAmount] = useState(String(item.amount));
  const [unit, setUnit] = useState(item.unit);
  const [price, setPrice] = useState(centsToEuroStr(item.unitPrice));
  const [fremd, setFremd] = useState(item.purchasePrice != null);
  const [purchase, setPurchase] = useState(
    item.purchasePrice != null ? centsToEuroStr(item.purchasePrice) : "",
  );
  const [surchargeType, setSurchargeType] = useState<SurchargeType>(
    item.surchargeType ?? "percent",
  );
  const [surchargeVal, setSurchargeVal] = useState(
    item.surcharge != null
      ? item.surchargeType === "fixed"
        ? centsToEuroStr(item.surcharge)
        : String(item.surcharge / 100)
      : "25",
  );

  const purchaseCents = eurosToCents(parseFloat(purchase) || 0);
  // percent → Basispunkte (12,50 % = 1250); fixed → Cents.
  const surchargeStored =
    surchargeType === "percent"
      ? Math.round((parseFloat(surchargeVal) || 0) * 100)
      : eurosToCents(parseFloat(surchargeVal) || 0);
  const salePrice = fremd
    ? computeUnitPrice(purchaseCents, surchargeStored, surchargeType)
    : eurosToCents(parseFloat(price) || 0);

  const ok =
    description.trim().length > 0 && (fremd ? purchaseCents > 0 : salePrice >= 0);

  function save() {
    const patch: ItemPatch = {
      descriptionDe: description.trim(),
      amount: parseFloat(amount) || 0,
      unit,
    };
    if (fremd) {
      patch.purchasePrice = purchaseCents;
      patch.surcharge = surchargeStored;
      patch.surchargeType = surchargeType;
    } else {
      patch.unitPrice = eurosToCents(parseFloat(price) || 0);
      patch.purchasePrice = null;
      patch.surcharge = null;
      patch.surchargeType = null;
    }
    onSave(patch);
  }

  return (
    <div className="d2-editor">
      <div className="f-grid">
        <div className="f-row">
          <label className="f-lbl" htmlFor={`ed-label-${item.id}`}>{t("labelLbl")}</label>
          <input id={`ed-label-${item.id}`} className="f-input" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="f-row two">
          <div className="f-row">
            <label className="f-lbl" htmlFor={`ed-qty-${item.id}`}>{t("quantity")}</label>
            <input id={`ed-qty-${item.id}`} className="f-input" type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="f-row">
            <label className="f-lbl" htmlFor={`ed-unit-${item.id}`}>{t("unitLbl")}</label>
            <input id={`ed-unit-${item.id}`} className="f-input" value={unit} onChange={(e) => setUnit(e.target.value)} />
          </div>
        </div>

        <button type="button" className="d2-fremd-toggle" data-on={fremd ? "1" : "0"} aria-pressed={fremd} onClick={() => setFremd((v) => !v)}>
          <Truck size={16} strokeWidth={STROKE} aria-hidden />
          {t("subcontract")}
        </button>

        {fremd ? (
          <>
            <div className="f-row two">
              <div className="f-row">
                <label className="f-lbl" htmlFor={`ed-purchase-${item.id}`}>
                  <span className="f-lbl-lock">
                    <Lock size={13} strokeWidth={STROKE} aria-hidden />
                    {t("purchase")} ({t("inclVat")})
                  </span>
                </label>
                <div className="f-affix">
                  <input id={`ed-purchase-${item.id}`} className="f-input" type="number" inputMode="decimal" value={purchase} onChange={(e) => setPurchase(e.target.value)} placeholder="0,00" />
                  <span className="f-unit">€</span>
                </div>
              </div>
              <div className="f-row">
                <label className="f-lbl" htmlFor={`ed-markup-${item.id}`}>{t("markup")}</label>
                <div className="f-affix">
                  <input id={`ed-markup-${item.id}`} className="f-input" type="number" inputMode="decimal" value={surchargeVal} onChange={(e) => setSurchargeVal(e.target.value)} />
                  <span className="f-unit">{surchargeType === "percent" ? "%" : "€"}</span>
                </div>
              </div>
            </div>
            <div className="picker-tabs" role="tablist">
              <button type="button" className="sheet-tab" data-on={surchargeType === "percent" ? "1" : "0"} role="tab" aria-selected={surchargeType === "percent"} onClick={() => setSurchargeType("percent")}>
                {t("markupPercent")}
              </button>
              <button type="button" className="sheet-tab" data-on={surchargeType === "fixed" ? "1" : "0"} role="tab" aria-selected={surchargeType === "fixed"} onClick={() => setSurchargeType("fixed")}>
                {t("markupFixed")}
              </button>
            </div>
            <div className="f-compute">
              <span className="f-compute-l">
                <span className="f-lock">
                  <Lock size={13} strokeWidth={STROKE} aria-hidden />
                  {t("internalOnly")}
                </span>
                <br />
                {t("salePrice")} ({t("onDocument")})
              </span>
              <span className="f-compute-v">{formatMoney(salePrice)}</span>
            </div>
          </>
        ) : (
          <div className="f-row">
            <label className="f-lbl" htmlFor={`ed-price-${item.id}`}>{t("unitPrice")}</label>
            <div className="f-affix">
              <input id={`ed-price-${item.id}`} className="f-input" type="number" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0,00" />
              <span className="f-unit">€</span>
            </div>
          </div>
        )}

        <div className="d2-editor-actions">
          <button type="button" className="d2-editor-cancel" onClick={onCancel}>
            <X size={16} strokeWidth={STROKE} aria-hidden />
            {t("close")}
          </button>
          <button type="button" className="d2-editor-save" disabled={!ok} onClick={save}>
            <Check size={16} strokeWidth={2.4} aria-hidden />
            {t("save")}
          </button>
        </div>
      </div>
    </div>
  );
}
