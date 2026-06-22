"use client";

import { useState } from "react";
import { Lock, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { FLOW_UNITS } from "@/lib/demo/flow-data";
import { berechneVerkaufspreis } from "@/lib/legal/marge";
import type { Position } from "@/lib/flow/positionen";
import { formatMoney } from "@/lib/format";
import { eurosToCents } from "@/lib/money";

const STROKE = 1.75;

interface FormProps {
  onAdd: (position: Position) => void;
}

const newId = () => `x-${crypto.randomUUID()}`;

/** Freie Position: Bezeichnung, Menge, Einheit, Einzelpreis. */
export function FreeForm({ onAdd }: FormProps) {
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
          <select id="ff-unit" className="f-select" value={unit} onChange={(e) => setUnit(e.target.value)}>
            {FLOW_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
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
          id: newId(),
          kind: "normal",
          label: label.trim(),
          uebersetzungen: null,
          qty: parseFloat(qty) || 1,
          unit,
          preisCents: eurosToCents(parseFloat(price) || 0),
        })}
      >
        <Plus size={20} strokeWidth={2.4} aria-hidden />
        {t("addBtn")}
      </button>
    </div>
  );
}

/** Fremdleistung: Einkauf + Aufschlag → Verkaufspreis (Einkauf/Marge intern). */
export function FremdForm({ onAdd }: FormProps) {
  const t = useTranslations("Step2");
  const [label, setLabel] = useState("");
  const [purchase, setPurchase] = useState("");
  const [markup, setMarkup] = useState("25");
  const einkaufCents = eurosToCents(parseFloat(purchase) || 0);
  const aufschlagPct = parseFloat(markup) || 0;
  const verkaufCents = berechneVerkaufspreis(einkaufCents, { typ: "prozent", wert: aufschlagPct });
  const ok = label.trim().length > 0 && einkaufCents > 0;

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
            <input id="fr-purchase" className="f-input" type="number" inputMode="decimal" value={purchase} onChange={(e) => setPurchase(e.target.value)} placeholder="0,00" />
            <span className="f-unit">€</span>
          </div>
        </div>
        <div className="f-row">
          <label className="f-lbl" htmlFor="fr-markup">{t("markup")}</label>
          <div className="f-affix">
            <input id="fr-markup" className="f-input" type="number" inputMode="decimal" value={markup} onChange={(e) => setMarkup(e.target.value)} />
            <span className="f-unit">%</span>
          </div>
        </div>
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
        <span className="f-compute-v">{formatMoney(verkaufCents)}</span>
      </div>
      <button
        type="button"
        className="f-submit"
        disabled={!ok}
        onClick={() => onAdd({
          id: newId(),
          kind: "fremd",
          label: label.trim(),
          unit: "Pauschal",
          einkaufCents,
          aufschlagPct,
          verkaufCents,
        })}
      >
        <Plus size={20} strokeWidth={2.4} aria-hidden />
        {t("addBtn")}
      </button>
    </div>
  );
}
