"use client";

import { useState } from "react";
import { Check, ChevronLeft, X } from "lucide-react";
import { useTranslations } from "next-intl";
import "./number-pad.css";

const STROKE = 1.75;

/** Feld, das der Ziffernblock gerade bearbeitet. `sale`/`purchase`/`markup`
 *  sind die Fremdleistungs-Felder (Verkaufspreis/Einkauf/Aufschlag). */
export type PadField = "qty" | "price" | "sale" | "purchase" | "markup";

interface NumberPadProps {
  field: PadField;
  unit: string;
  /** Positionsname für die Kopfzeile. */
  name: string;
  /** Startwert als Roh-String mit Dezimalkomma (z. B. "12,5" oder "-12,5"). */
  initial: string;
  /** Preisfelder: ±-Taste, ein negativer Betrag ist ein Abzug. */
  signed?: boolean;
  /** Bestätigter Wert als Zahl (Menge bzw. Preis in Euro). */
  onCommit: (value: number) => void;
  /** Rein lokale Vorschau; löst keine Server-Action aus. */
  onPreview: (value: number) => void;
  onClose: () => void;
}

/** Getippte Eingabe auf Ziffern + ein Dezimalkomma (max. 2 Nachkommastellen)
 *  begrenzen und führende Nullen entfernen. */
function sanitize(input: string): string {
  const cleaned = input.replace(/\./g, ",").replace(/[^0-9,]/g, "");
  const comma = cleaned.indexOf(",");
  let intPart = comma === -1 ? cleaned : cleaned.slice(0, comma).replace(/,/g, "");
  const decPart = comma === -1 ? null : cleaned.slice(comma + 1).replace(/,/g, "").slice(0, 2);
  intPart = intPart.replace(/^0+(?=\d)/, "");
  if (intPart === "") intPart = "0";
  return decPart === null ? intPart : `${intPart},${decPart}`;
}

/** Trennt ein führendes Minus ab – nur bei Preisfeldern (`signed`). */
function splitSign(input: string, signed: boolean): { negative: boolean; digits: string } {
  const trimmed = input.trim();
  const negative = signed && trimmed.startsWith("-");
  return { negative, digits: negative ? trimmed.slice(1) : trimmed };
}

function toNumber(digits: string, negative: boolean): number {
  const value = parseFloat((digits || "0").replace(",", ".")) || 0;
  return negative ? -value : value;
}

/** Großflächiger Ziffernblock (Variante B): Menge oder Preis für diese Rechnung
 *  anpassen — per Tasten ODER direkt im Eingabefeld tippbar. Zahlen bleiben LTR,
 *  damit die Eingabe auch in RTL vorhersehbar ist. */
export function NumberPad({
  field,
  unit,
  name,
  initial,
  signed = false,
  onCommit,
  onPreview,
  onClose,
}: NumberPadProps) {
  const t = useTranslations("Step2");
  const [initialSign] = useState(() => splitSign(initial || "0", signed));
  const [raw, setRaw] = useState(initialSign.digits || "0");
  const [negative, setNegative] = useState(initialSign.negative);

  const previewValue = (nextRaw: string, nextNegative = negative) => {
    setRaw(nextRaw);
    setNegative(nextNegative);
    onPreview(toNumber(nextRaw, nextNegative));
  };
  const type = (digit: string) => {
    let next = raw;
    if (digit === ",") {
      next = raw.includes(",") ? raw : (raw || "0") + ",";
    } else if (!(raw.includes(",") && raw.split(",")[1].length >= 2)) {
      next = (raw === "0" ? "" : raw) + digit;
    }
    previewValue(next);
  };
  const back = () => previewValue(raw.slice(0, -1) || "0");
  const toggleSign = () => previewValue(raw, !negative);
  const commit = () => onCommit(toNumber(raw, negative));

  const label =
    field === "qty"
      ? t("quantity")
      : field === "sale"
        ? t("salePrice")
        : field === "purchase"
          ? t("purchase")
          : field === "markup"
            ? t("markup")
            : t("price");
  const suffix = field === "qty" ? unit : field === "markup" ? "%" : "€";
  const keepFocus = (e: React.MouseEvent) => e.preventDefault();

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
        <div className="d2pad-disp" dir="ltr">
          <input
            className="d2pad-input"
            value={negative ? `-${raw}` : raw}
            inputMode="decimal"
            autoFocus
            aria-label={`${label} · ${name}`}
            onChange={(e) => {
              const typed = splitSign(e.target.value, signed);
              previewValue(sanitize(typed.digits), typed.negative);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              else if (e.key === "Escape") onClose();
            }}
          />
          <span className="d2pad-unit">{suffix}</span>
        </div>
        <div className="d2pad-keys" dir="ltr">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((k) => (
            <button key={k} type="button" className="d2pad-key" onMouseDown={keepFocus} onClick={() => type(k)}>
              {k}
            </button>
          ))}
          <button type="button" className="d2pad-key" onMouseDown={keepFocus} onClick={() => type(",")}>,</button>
          <button type="button" className="d2pad-key" onMouseDown={keepFocus} onClick={() => type("0")}>0</button>
          <button type="button" className="d2pad-key" onMouseDown={keepFocus} onClick={back} aria-label={t("backspace")}>
            <ChevronLeft size={22} strokeWidth={2.4} aria-hidden />
          </button>
          {signed && (
            <button
              type="button"
              className="d2pad-key d2pad-key--sign"
              aria-pressed={negative}
              aria-label={t("toggleSign")}
              onMouseDown={keepFocus}
              onClick={toggleSign}
            >
              ±
            </button>
          )}
          <button
            type="button"
            className={signed ? "d2pad-key d2pad-key--ok d2pad-key--ok-short" : "d2pad-key d2pad-key--ok"}
            onMouseDown={keepFocus}
            onClick={commit}
          >
            <Check size={20} strokeWidth={2.4} aria-hidden />
            {t("done")}
          </button>
        </div>
      </div>
    </div>
  );
}
