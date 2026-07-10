"use client";

import { useState } from "react";
import { Check, ChevronLeft, X } from "lucide-react";
import { useTranslations } from "next-intl";

const STROKE = 1.75;

/** Feld, das der Ziffernblock gerade bearbeitet. */
export type PadField = "qty" | "price";

interface NumberPadProps {
  field: PadField;
  unit: string;
  /** Positionsname für die Kopfzeile. */
  name: string;
  /** Startwert als Roh-String mit Dezimalkomma (z. B. "12,5"). */
  initial: string;
  /** Bestätigter Wert als Zahl (Menge bzw. Preis in Euro). */
  onCommit: (value: number) => void;
  onClose: () => void;
}

/** Großflächiger Ziffernblock (Variante B): Menge oder Preis für diese Rechnung
 *  anpassen. Zahlen bleiben LTR, damit die Eingabe auch in RTL vorhersehbar ist. */
export function NumberPad({ field, unit, name, initial, onCommit, onClose }: NumberPadProps) {
  const t = useTranslations("Step2");
  const [raw, setRaw] = useState(initial || "0");

  const type = (d: string) =>
    setRaw((s) => {
      if (d === ",") return s.includes(",") ? s : (s || "0") + ",";
      if (s.includes(",") && s.split(",")[1].length >= 2) return s;
      return (s === "0" ? "" : s) + d;
    });
  const back = () => setRaw((s) => s.slice(0, -1) || "0");
  const commit = () => onCommit(parseFloat((raw || "0").replace(",", ".")) || 0);

  const label = field === "qty" ? t("quantity") : t("price");
  const display = field === "qty" ? `${raw} ${unit}` : `${raw} €`;

  return (
    <div
      className="d2pad-bd"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="d2pad" role="dialog" aria-modal="true" aria-label={`${label} · ${name}`}>
        <div className="d2pad-head">
          <span className="d2pad-title">{label} · {name}</span>
          <button type="button" className="d2pad-x" onClick={onClose} aria-label={t("close")}>
            <X size={18} strokeWidth={STROKE} aria-hidden />
          </button>
        </div>
        <div className="d2pad-disp" dir="ltr">{display}</div>
        <div className="d2pad-keys" dir="ltr">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((k) => (
            <button key={k} type="button" className="d2pad-key" onClick={() => type(k)}>
              {k}
            </button>
          ))}
          <button type="button" className="d2pad-key" onClick={() => type(",")}>,</button>
          <button type="button" className="d2pad-key" onClick={() => type("0")}>0</button>
          <button type="button" className="d2pad-key" onClick={back} aria-label={t("backspace")}>
            <ChevronLeft size={22} strokeWidth={2.4} aria-hidden />
          </button>
          <button type="button" className="d2pad-key d2pad-key--ok" onClick={commit}>
            <Check size={20} strokeWidth={2.4} aria-hidden />
            {t("done")}
          </button>
        </div>
      </div>
    </div>
  );
}
