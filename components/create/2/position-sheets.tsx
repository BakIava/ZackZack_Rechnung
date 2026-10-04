"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { filterUnits, FLOW_UNITS, withCurrentUnit } from "@/lib/documents/units";
import type { DraftItem, TaxRate } from "@/types/document";
import { AdditionalDescriptionSheet } from "./additional-description-sheet";
import "./position-sheets.css";

const STROKE = 1.75;

/** Persistierbare MwSt.-Sätze je Position. */
export const FLOW_VAT_RATES = [19, 7, 0] as const satisfies readonly TaxRate[];

/** Feld, das der Direkt-Editor gerade bearbeitet (Nicht-Ziffernfelder). */
export type SheetField = "desc" | "additionalDescription" | "unit" | "vat";

interface DescSheetProps {
  item: DraftItem;
  onPreview: (value: string) => void;
  onCommit: (value: string) => void;
  onClose: () => void;
}

/** Bezeichnung ändern: kurzes Textfeld. */
function DescSheet({ item, onPreview, onCommit, onClose }: DescSheetProps) {
  const t = useTranslations("Step2");
  const [value, setValue] = useState(item.descriptionDe);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);
  const ok = value.trim().length > 0;
  const commit = () => {
    if (ok) onCommit(value.trim());
  };

  return (
    <>
      <div className="zz-sheet-h">
        <div className="zz-sheet-tt">
          <span className="zz-sheet-lbl">{t("editDescT")}</span>
        </div>
        <button type="button" className="zz-x" onClick={onClose} aria-label={t("close")}>
          <X size={18} strokeWidth={STROKE} aria-hidden />
        </button>
      </div>
      <input
        ref={ref}
        className="zz-desc-input"
        value={value}
        placeholder={t("descPh")}
        onChange={(e) => {
          setValue(e.target.value);
          onPreview(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          else if (e.key === "Escape") onClose();
        }}
      />
      <button type="button" className="zz-done" disabled={!ok} onClick={commit}>
        <Check size={19} strokeWidth={2.4} aria-hidden />
        {t("done")}
      </button>
    </>
  );
}

interface UnitSheetProps {
  item: DraftItem;
  onPreview: (unit: string) => void;
  onCommit: (unit: string) => void;
  onClose: () => void;
}

/** Einheit wählen: Raster aus den Standard-Einheiten. */
function UnitSheet({ item, onPreview, onCommit, onClose }: UnitSheetProps) {
  const t = useTranslations("Step2");
  const [query, setQuery] = useState("");
  const [value, setValue] = useState(item.unit);
  const unitOptions = withCurrentUnit(FLOW_UNITS, item.unit);
  const filteredUnits = filterUnits(unitOptions, query);
  return (
    <>
      <div className="zz-sheet-h">
        <div className="zz-sheet-tt">
          <span className="zz-sheet-lbl">{t("editUnitT")}</span>
          <span className="zz-sheet-name">{item.descriptionDe}</span>
        </div>
        <button type="button" className="zz-x" onClick={onClose} aria-label={t("close")}>
          <X size={18} strokeWidth={STROKE} aria-hidden />
        </button>
      </div>
      <div className="zz-unit-filter">
        <Search size={17} strokeWidth={STROKE} aria-hidden />
        <input
          type="search"
          value={query}
          placeholder={t("searchUnit")}
          aria-label={t("searchUnit")}
          autoFocus
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      <div className="zz-choices zz-choices--grid">
        {filteredUnits.length === 0 ? (
          <div className="zz-unit-empty">{t("noUnitResults")}</div>
        ) : (
          filteredUnits.map((u) => (
            <button
              key={u}
              type="button"
              className="zz-choice"
              data-on={value === u ? "1" : "0"}
              onClick={() => {
                setValue(u);
                onPreview(u);
              }}
            >
              <span className="zz-choice-l">{u}</span>
            </button>
          ))
        )}
      </div>
      <button type="button" className="zz-done" onClick={() => onCommit(value)}>
        <Check size={19} strokeWidth={2.4} aria-hidden />
        {t("done")}
      </button>
    </>
  );
}

interface VatSheetProps {
  item: DraftItem;
  vat: TaxRate | null;
  companyVat: TaxRate;
  onPreview: (vat: TaxRate | null) => void;
  onCommit: (vat: TaxRate | null) => void;
  onClose: () => void;
}

/** MwSt.-Satz wählen. „Standard" folgt dem eingefrorenen Dokumentstandard. */
function VatSheet({ item, vat, companyVat, onPreview, onCommit, onClose }: VatSheetProps) {
  const t = useTranslations("Step2");
  const [value, setValue] = useState<TaxRate | null>(vat);
  const options: { key: string; value: TaxRate | null; label: string; sub?: string }[] = [
    { key: "std", value: null, label: t("vatStdOn", { rate: companyVat }), sub: t("vatStd") },
    ...FLOW_VAT_RATES.map((r) => ({ key: String(r), value: r, label: `${r} %` })),
  ];
  const current = value == null ? "std" : String(value);

  return (
    <>
      <div className="zz-sheet-h">
        <div className="zz-sheet-tt">
          <span className="zz-sheet-lbl">{t("editVatT")}</span>
          <span className="zz-sheet-name">{item.descriptionDe}</span>
        </div>
        <button type="button" className="zz-x" onClick={onClose} aria-label={t("close")}>
          <X size={18} strokeWidth={STROKE} aria-hidden />
        </button>
      </div>
      <div className="zz-choices">
        {options.map((o) => (
          <button
            key={o.key}
            type="button"
            className="zz-choice"
            data-on={current === o.key ? "1" : "0"}
            onClick={() => {
              setValue(o.value);
              onPreview(o.value);
            }}
          >
            <span className="zz-choice-l">
              {o.label}
              {o.sub && <span className="zz-choice-sub">{o.sub}</span>}
            </span>
            {current === o.key && (
              <span className="zz-choice-tick">
                <Check size={15} strokeWidth={2.4} aria-hidden />
              </span>
            )}
          </button>
        ))}
      </div>
      <button type="button" className="zz-done" onClick={() => onCommit(value)}>
        <Check size={19} strokeWidth={2.4} aria-hidden />
        {t("done")}
      </button>
    </>
  );
}

export interface PositionEditorState {
  item: DraftItem;
  field: SheetField;
  vat: TaxRate | null;
}

interface PositionEditorProps {
  editor: PositionEditorState | null;
  companyVat: TaxRate;
  onClose: () => void;
  onPreviewDesc: (itemId: string, value: string) => void;
  onPreviewAdditionalDescription: (itemId: string, value: string) => void;
  onPreviewUnit: (itemId: string, unit: string) => void;
  onPreviewVat: (itemId: string, vat: TaxRate | null) => void;
  onCommitDesc: (itemId: string, value: string) => void;
  onCommitAdditionalDescription: (itemId: string, value: string) => void;
  onCommitUnit: (itemId: string, unit: string) => void;
  onCommitVat: (itemId: string, vat: TaxRate | null) => void;
}

/** Zentrierter Direkt-Editor für Bezeichnung / Einheit / MwSt. */
export function PositionEditor({
  editor,
  companyVat,
  onClose,
  onPreviewDesc,
  onPreviewAdditionalDescription,
  onPreviewUnit,
  onPreviewVat,
  onCommitDesc,
  onCommitAdditionalDescription,
  onCommitUnit,
  onCommitVat,
}: PositionEditorProps) {
  const t = useTranslations("Step2");
  if (!editor) return null;
  const { item, field, vat } = editor;
  const label = field === "desc"
    ? t("editDescT")
    : field === "additionalDescription"
      ? t("additionalDescriptionTitle")
      : field === "unit" ? t("editUnitT") : t("editVatT");

  return (
    <div
      className="position-editor-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
    >
      <div className="zz-sheet" role="dialog" aria-modal="true" aria-label={label}>
        {field === "desc" && (
          <DescSheet
            item={item}
            onPreview={(value) => onPreviewDesc(item.id, value)}
            onCommit={(value) => onCommitDesc(item.id, value)}
            onClose={onClose}
          />
        )}
        {field === "additionalDescription" && (
          <AdditionalDescriptionSheet
            item={item}
            onPreview={(value) => onPreviewAdditionalDescription(item.id, value)}
            onCommit={(value) => onCommitAdditionalDescription(item.id, value)}
            onClose={onClose}
          />
        )}
        {field === "unit" && (
          <UnitSheet
            item={item}
            onPreview={(unit) => onPreviewUnit(item.id, unit)}
            onCommit={(unit) => onCommitUnit(item.id, unit)}
            onClose={onClose}
          />
        )}
        {field === "vat" && (
          <VatSheet
            item={item}
            vat={vat}
            companyVat={companyVat}
            onPreview={(value) => onPreviewVat(item.id, value)}
            onCommit={(value) => onCommitVat(item.id, value)}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
}
