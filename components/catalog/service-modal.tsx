"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Modal } from "@/components/ui";
import { UnitPicker } from "@/components/shared/unit-picker";
import type { KatalogEintrag } from "@/types/service";
import { withCurrentUnit } from "@/lib/documents/units";
import "./service-modal.css";

interface ServiceModalProps {
  dir: "ltr" | "rtl";
  item: KatalogEintrag | null;
  units: readonly string[];
  onClose: () => void;
  onSave: (entry: KatalogEintrag) => void;
}

const STROKE = 1.75;
const TEMP_ID_PREFIX = "tmp_";

function parsePrice(raw: string): number {
  const normalized = raw.trim().replace(",", ".");
  if (normalized === "") return 0;
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? NaN : Math.round(parsed * 100);
}

function isPriceValid(raw: string): boolean {
  if (raw.trim() === "") return true;
  const cents = parsePrice(raw);
  return !isNaN(cents) && cents > 0;
}

export function ServiceModal({ dir, item, units, onClose, onSave }: ServiceModalProps) {
  const t = useTranslations("Catalog");
  const isNew = !item;

  const [de, setDe] = useState(item?.de ?? "");
  const [tr, setTr] = useState(item?.uebersetzungen.tr ?? "");
  const [ar, setAr] = useState(item?.uebersetzungen.ar ?? "");
  const [einheit, setEinheit] = useState(item?.einheit || units[0]);
  const [preisStr, setPreisStr] = useState(
    item && item.preisCents > 0 ? (item.preisCents / 100).toFixed(2).replace(".", ",") : "",
  );
  const unitOptions = withCurrentUnit(units, item?.einheit);

  const ok = de.trim().length > 0 && isPriceValid(preisStr);

  function submit() {
    if (!ok) return;
    const preisCents = parsePrice(preisStr);
    onSave({
      id: item?.id ?? `${TEMP_ID_PREFIX}${Date.now()}`,
      de: de.trim(),
      uebersetzungen: {
        de: de.trim(),
        tr: tr.trim(),
        ar: ar.trim(),
      },
      einheit,
      preisCents: isNaN(preisCents) ? 0 : preisCents,
      kategorie: item?.kategorie ?? "Sonstiges",
      verwendungen: item?.verwendungen ?? 0,
    });
  }

  return (
    <Modal
      open
      onClose={onClose}
      dir={dir}
      size="md"
      className="smod"
      ariaLabel={isNew ? t("addTitle") : t("editTitle")}
    >
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
              dir="ltr"
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
                dir="ltr"
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
                dir="rtl"
                value={ar}
                onChange={(e) => setAr(e.target.value)}
                placeholder="عربي …"
              />
            </div>
          </div>

          {/* Einheit + Preis */}
          <div className="f-row-two">
            <div className="f-row">
              <label className="f-lbl" htmlFor="service-unit">{t("unitSel")}</label>
              <UnitPicker
                id="service-unit"
                units={unitOptions}
                value={einheit}
                searchPlaceholder={t("searchUnit")}
                noResultsLabel={t("noUnitResults")}
                onChange={setEinheit}
              />
            </div>
            <div className="f-row">
              <label className="f-lbl">
                {t("priceLbl")}
                <span className="smod-opt">{t("optional")}</span>
              </label>
              <div className="f-affix">
                <input
                  className="f-input"
                  type="text"
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
    </Modal>
  );
}
