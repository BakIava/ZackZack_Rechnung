"use client";

import { ChevronDown, ChevronUp, Languages, Lock, Minus, Plus, Trash2, Truck } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { lineTotalCents, type Position } from "@/lib/flow/positionen";
import { formatMoney } from "@/lib/format";

const STROKE = 1.75;

interface PositionRowProps {
  position: Position;
  locale: Locale;
  index: number;
  count: number;
  onQty: (id: string, delta: number) => void;
  onDelete: (id: string) => void;
  onMove: (index: number, delta: number) => void;
}

/** Desktop-Tabellenzeile einer Position (inkl. internem Fremdleistungs-Block). */
export function PositionRow({ position, locale, index, count, onQty, onDelete, onMove }: PositionRowProps) {
  const t = useTranslations("Step2");
  const fromTerm =
    position.kind === "normal" && position.uebersetzungen && locale !== "de"
      ? position.uebersetzungen[locale]
      : null;

  return (
    <div className="d2row">
      <div className="d2-rh">
        <button type="button" disabled={index === 0} onClick={() => onMove(index, -1)} aria-label={t("moveUp")}>
          <ChevronUp size={15} strokeWidth={STROKE} aria-hidden />
        </button>
        <button type="button" disabled={index === count - 1} onClick={() => onMove(index, 1)} aria-label={t("moveDown")}>
          <ChevronDown size={15} strokeWidth={STROKE} aria-hidden />
        </button>
      </div>

      <div className="d2-namecell">
        <div className="d2-name">{position.label}</div>
        {fromTerm && (
          <div className="d2-from">
            <Languages size={13} strokeWidth={STROKE} aria-hidden />
            {t("youPick")}: <b>{fromTerm}</b>
          </div>
        )}
        {position.kind === "fremd" && (
          <div className="p2-fremdtag">
            <Truck size={13} strokeWidth={STROKE} aria-hidden />
            {t("subcontract")}
          </div>
        )}
      </div>

      {position.kind === "normal" ? (
        <>
          <div className="d2-stepper">
            <button type="button" onClick={() => onQty(position.id, -1)} aria-label={t("less")}>
              <Minus size={16} strokeWidth={2.4} aria-hidden />
            </button>
            <span className="d2-stepper-v">{position.qty} {position.unit}</span>
            <button type="button" onClick={() => onQty(position.id, 1)} aria-label={t("more")}>
              <Plus size={16} strokeWidth={2.4} aria-hidden />
            </button>
          </div>
          <div className="d2-price">{formatMoney(position.preisCents)}</div>
        </>
      ) : (
        <>
          <div className="d2-price d2-price--start">{position.unit}</div>
          <div className="d2-price">—</div>
        </>
      )}

      <div className="d2-sum">{formatMoney(lineTotalCents(position))}</div>
      <div className="d2-acts">
        <button type="button" className="d2-iconbtn d2-iconbtn--del" onClick={() => onDelete(position.id)} aria-label={t("delete")}>
          <Trash2 size={17} strokeWidth={STROKE} aria-hidden />
        </button>
      </div>

      {position.kind === "fremd" && (
        <div className="d2-internrow">
          <div className="d2-intern">
            <span className="d2-intern-h">
              <Lock size={14} strokeWidth={STROKE} aria-hidden />
              {t("internalOnly")}
            </span>
            <span className="d2-intern-i">{t("purchase")} ({t("inclVat")}): <b>{formatMoney(position.einkaufCents)}</b></span>
            <span className="d2-intern-i">{t("markup")}: <b>{position.aufschlagPct} %</b></span>
            <span className="d2-intern-i">{t("salePrice")}: <b>{formatMoney(position.verkaufCents)}</b></span>
            <span className="d2-intern-note">
              <Lock size={12} strokeWidth={STROKE} aria-hidden />
              {t("notOnDoc")}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
