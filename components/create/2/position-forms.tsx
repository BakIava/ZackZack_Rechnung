"use client";

import { useState } from "react";
import { Lock, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { UnitPicker } from "@/components/shared/unit-picker";
import { FLOW_UNITS } from "@/lib/documents/units";
import {
  computeUnitPrice,
  fixedSurchargeForSale,
  surchargeBasisPointsForSale,
} from "@/lib/documents/margin";
import type { FreeItemInput, FremdItemInput } from "@/types/document";
import { eurosToCents } from "@/lib/money";
import "./position-forms.css";

const STROKE = 1.75;

/** Freie Position: Bezeichnung, Menge, Einheit, Einzelpreis. */
export function FreeForm({ onAdd }: { onAdd: (input: FreeItemInput) => void }) {
  const t = useTranslations("Step2");
  const [label, setLabel] = useState("");
  const [qty, setQty] = useState("1");
  const [unit, setUnit] = useState("m²");
  const [price, setPrice] = useState("");
  const ok = label.trim().length > 0 && parseFloat(price) > 0;

  return (
    <div className="f-grid">
      <div className="f-row">
        <label className="f-lbl" htmlFor="ff-label">{t("labelLbl")}</label>
        <input id="ff-label" className="f-input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="z. B. Abdeckarbeiten" />
      </div>
      <div className="f-row two">
        <div className="f-row">
          <label className="f-lbl" htmlFor="ff-qty">{t("quantity")}</label>
          <input id="ff-qty" className="f-input" type="number" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} />
        </div>
        <div className="f-row">
          <label className="f-lbl" htmlFor="ff-unit">{t("unitLbl")}</label>
          <UnitPicker
            id="ff-unit"
            units={FLOW_UNITS}
            value={unit}
            searchPlaceholder={t("searchUnit")}
            noResultsLabel={t("noUnitResults")}
            onChange={setUnit}
          />
        </div>
      </div>
      <div className="f-row">
        <label className="f-lbl" htmlFor="ff-price">{t("unitPrice")}</label>
        <div className="f-affix">
          <input id="ff-price" className="f-input" type="number" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0,00" />
          <span className="f-unit">€</span>
        </div>
      </div>
      <button
        type="button"
        className="f-submit"
        disabled={!ok}
        onClick={() => onAdd({
          descriptionDe: label.trim(),
          amount: parseFloat(qty) || 1,
          unit,
          unitPrice: eurosToCents(parseFloat(price) || 0),
        })}
      >
        <Plus size={20} strokeWidth={2.4} aria-hidden />
        {t("addBtn")}
      </button>
    </div>
  );
}

/** Fremdleistung: Einkauf + Aufschlag → Verkaufspreis (Einkauf/Marge intern). */
export function FremdForm({ onAdd }: { onAdd: (input: FremdItemInput) => void }) {
  const t = useTranslations("Step2");
  const [label, setLabel] = useState("");
  const [purchase, setPurchase] = useState("");
  const [markup, setMarkup] = useState("25");
  const [salePrice, setSalePrice] = useState("");
  const [priceSource, setPriceSource] = useState<"markup" | "sale">("markup");
  const purchaseCents = eurosToCents(parseFloat(purchase) || 0);
  const surchargeBp = Math.round((parseFloat(markup) || 0) * 100);
  const calculatedSalePriceCents = computeUnitPrice(purchaseCents, surchargeBp, "percent");
  const salePriceCents = priceSource === "sale"
    ? eurosToCents(parseFloat(salePrice) || 0)
    : calculatedSalePriceCents;
  const ok = label.trim().length > 0 && purchaseCents > 0 && salePriceCents > 0;

  const updatePurchase = (value: string) => {
    setPurchase(value);
    if (priceSource !== "sale") return;

    const nextPurchaseCents = eurosToCents(parseFloat(value) || 0);
    const nextSalePriceCents = eurosToCents(parseFloat(salePrice) || 0);
    const nextSurchargeBp = surchargeBasisPointsForSale(
      nextPurchaseCents,
      nextSalePriceCents,
    );
    setMarkup(String(nextSurchargeBp / 100));
  };

  const updateMarkup = (value: string) => {
    setMarkup(value);
    setPriceSource("markup");
  };

  const updateSalePrice = (value: string) => {
    setSalePrice(value);
    setPriceSource("sale");

    const nextSalePriceCents = eurosToCents(parseFloat(value) || 0);
    const nextSurchargeBp = surchargeBasisPointsForSale(
      purchaseCents,
      nextSalePriceCents,
    );
    setMarkup(String(nextSurchargeBp / 100));
  };

  return (
    <div className="f-grid">
      <div className="f-row">
        <label className="f-lbl" htmlFor="fr-label">{t("labelLbl")}</label>
        <input id="fr-label" className="f-input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="z. B. Gerüststellung" />
      </div>
      <div className="f-row two">
        <div className="f-row">
          <label className="f-lbl" htmlFor="fr-purchase">
            <span className="f-lbl-lock">
              <Lock size={13} strokeWidth={STROKE} aria-hidden />
              {t("purchase")} ({t("inclVat")})
            </span>
          </label>
          <div className="f-affix">
            <input id="fr-purchase" className="f-input" type="number" inputMode="decimal" value={purchase} onChange={(e) => updatePurchase(e.target.value)} placeholder="0,00" />
            <span className="f-unit">€</span>
          </div>
        </div>
        <div className="f-row">
          <label className="f-lbl" htmlFor="fr-markup">{t("markup")}</label>
          <div className="f-affix">
            <input id="fr-markup" className="f-input" type="number" inputMode="decimal" value={markup} onChange={(e) => updateMarkup(e.target.value)} />
            <span className="f-unit">%</span>
          </div>
        </div>
      </div>
      <div className="f-compute">
        <label className="f-compute-l" htmlFor="fr-sale-price">
          <span className="f-lock">
            <Lock size={13} strokeWidth={STROKE} aria-hidden />
            {t("internalOnly")}
          </span>
          <br />
          {t("salePrice")} ({t("onDocument")})
        </label>
        <div className="f-affix f-compute-input">
          <input
            id="fr-sale-price"
            className="f-input"
            type="number"
            inputMode="decimal"
            value={priceSource === "sale" ? salePrice : salePriceCents / 100}
            onChange={(e) => updateSalePrice(e.target.value)}
            placeholder="0,00"
          />
          <span className="f-unit">€</span>
        </div>
      </div>
      <button
        type="button"
        className="f-submit"
        disabled={!ok}
        onClick={() => onAdd({
          descriptionDe: label.trim(),
          unit: "Pauschale",
          amount: 1,
          purchasePrice: purchaseCents,
          surcharge: priceSource === "sale"
            ? fixedSurchargeForSale(purchaseCents, salePriceCents)
            : surchargeBp,
          surchargeType: priceSource === "sale" ? "fixed" : "percent",
        })}
      >
        <Plus size={20} strokeWidth={2.4} aria-hidden />
        {t("addBtn")}
      </button>
    </div>
  );
}
