"use client";

import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { KatalogEintrag } from "@/lib/katalog/types";
import "./service-modal.css";

interface ServiceModalProps {
  dir: "ltr" | "rtl";
  item: KatalogEintrag | null;
  units: string[];
  onClose: () => void;
  onSave: (entry: KatalogEintrag) => void;
}

const STROKE = 1.75;

export function ServiceModal({ dir, item, units, onClose, onSave }: ServiceModalProps) {
  const t = useTranslations("Catalog");
  const isNew = !item;

  const [de, setDe] = useState(item?.de ?? "");
  const [tr, setTr] = useState(item?.uebersetzungen.tr ?? "");
  const [ar, setAr] = useState(item?.uebersetzungen.ar ?? "");
  const [einheit, setEinheit] = useState(item?.einheit ?? "m²");
  const [preisStr, setPreisStr] = useState(
    item ? String((item.preisCents / 100).toFixed(2)) : "",
  );

  const preisCents = Math.round(parseFloat(preisStr) * 100);
  const ok = de.trim().length > 0 && !isNaN(preisCents) && preisCents > 0;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function submit() {
    if (!ok) return;
    onSave({
      id: item?.id ?? `u${Date.now()}`,
      de: de.trim(),
      uebersetzungen: {
        de: de.trim(),
        tr: tr.trim(),
        ar: ar.trim(),
      },
      einheit,
      preisCents,
      kategorie: item?.kategorie ?? "Sonstiges",
      verwendungen: item?.verwendungen ?? 0,
    });
  }

  return (
    <div className="smod-wrap" dir={dir}>
      <div className="smod-bd" onClick={onClose} />
      <div className="smod">
        <div className="smod-head">
          <span className="smod-title">{isNew ? t("addTitle") : t("editTitle")}</span>
          <button type="button" className="smod-x" onClick={onClose} aria-label={t("cancel")}>
            <X size={18} strokeWidth={STROKE} aria-hidden />
          </button>
        </div>
        <div className="smod-sub">{t("translateNote")}</div>

        <div className="smod-body">
          <div className="smod-grid">
            {/* Deutsch (Pflicht) */}
            <div className="f-row">
              <label className="f-lbl">
                {t("nameDe")}
                <span className="smod-on-doc">{t("onDoc")}</span>
              </label>
              <input
                className="f-input"
                value={de}
                onChange={(e) => setDe(e.target.value)}
                placeholder="z. B. Malerarbeiten Wandfläche"
                autoFocus
              />
            </div>

            {/* TR + AR */}
            <div className="f-row-two">
              <div className="f-row">
                <label className="f-lbl">
                  {t("nameTr")}
                  <span className="smod-opt">{t("optional")}</span>
                </label>
                <input
                  className="f-input"
                  value={tr}
                  onChange={(e) => setTr(e.target.value)}
                  placeholder="Türkçe …"
                />
              </div>
              <div className="f-row">
                <label className="f-lbl">
                  {t("nameAr")}
                  <span className="smod-opt">{t("optional")}</span>
                </label>
                <input
                  className="f-input"
                  value={ar}
                  onChange={(e) => setAr(e.target.value)}
                  placeholder="عربي …"
                  dir="rtl"
                />
              </div>
            </div>

            {/* Einheit + Preis */}
            <div className="f-row-two">
              <div className="f-row">
                <label className="f-lbl">{t("unitSel")}</label>
                <select
                  className="f-select"
                  value={einheit}
                  onChange={(e) => setEinheit(e.target.value)}
                >
                  {units.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
              <div className="f-row">
                <label className="f-lbl">{t("priceLbl")}</label>
                <div className="f-affix">
                  <input
                    className="f-input"
                    type="number"
                    min="0"
                    step="0.5"
                    inputMode="decimal"
                    value={preisStr}
                    onChange={(e) => setPreisStr(e.target.value)}
                    placeholder="0,00"
                  />
                  <span className="f-unit">€</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="smod-foot">
          <button type="button" className="nc-cancel" onClick={onClose}>
            {t("cancel")}
          </button>
          <button type="button" className="smod-save" disabled={!ok} onClick={submit}>
            <Check size={18} strokeWidth={2.4} aria-hidden />
            {t("save")}
          </button>
        </div>
      </div>
    </div>
  );
}
