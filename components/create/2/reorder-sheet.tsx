"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Check, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Modal } from "@/components/ui";
import { formatMoney } from "@/lib/format";
import { moveByOne, moveToIndex } from "@/lib/documents/item-order";
import type { DraftItem } from "@/types/document";
import { PositionPicker } from "./position-picker";
import "./reorder-sheet.css";

const STROKE = 1.75;

interface ReorderSheetProps {
  dir: "ltr" | "rtl";
  items: DraftItem[];
  /** Vollständige Positions-IDs in neuer Reihenfolge (oben → unten). */
  onSave: (orderedIds: string[]) => void;
  onClose: () => void;
}

/**
 * „Reihenfolge ändern": alle Positionen kompakt auf einem Bildschirm. ↑ ↓ für
 * kleine Schritte, Nummer antippen für weite Sprünge. Erst „Fertig" speichert.
 */
export function ReorderSheet({ dir, items, onSave, onClose }: ReorderSheetProps) {
  const t = useTranslations("Step2");
  const titleId = useId();
  const [order, setOrder] = useState(items);
  const [pickingId, setPickingId] = useState<string | null>(null);
  const [movedId, setMovedId] = useState<string | null>(null);
  const rows = useRef(new Map<string, HTMLLIElement>());
  const picking = order.find((item) => item.id === pickingId) ?? null;

  // Die verschobene Zeile im Blick behalten – auch nach einem weiten Sprung.
  useEffect(() => {
    if (movedId && !pickingId) rows.current.get(movedId)?.scrollIntoView({ block: "nearest" });
  }, [movedId, order, pickingId]);

  function apply(next: DraftItem[], id: string) {
    setOrder(next);
    setMovedId(id);
  }

  function pick(position: number) {
    if (!picking) return;
    apply(moveToIndex(order, order.indexOf(picking), position - 1), picking.id);
    setPickingId(null);
  }

  return (
    <Modal open dir={dir} onClose={onClose} labelledBy={titleId} size="md" className="reorder-sheet">
      <div className="reorder-head">
        <h2 id={titleId} className="reorder-title">
          {picking ? t("moveToTitle") : t("reorderOpen")}
        </h2>
        <button type="button" className="reorder-close" aria-label={t("close")} onClick={onClose}>
          <X size={20} strokeWidth={STROKE} aria-hidden />
        </button>
      </div>

      {picking ? (
        <div className="reorder-body reorder-body--picking">
          <p className="reorder-picking-name" lang="de">{picking.descriptionDe}</p>
          <p className="reorder-hint">{t("moveToHint")}</p>
          <PositionPicker count={order.length} current={order.indexOf(picking) + 1} onPick={pick} />
        </div>
      ) : (
        <div className="reorder-body">
          <p className="reorder-hint">{t("reorderHint")}</p>
          <ol className="reorder-list">
            {order.map((item, index) => (
              <li
                key={item.id}
                ref={(element) => {
                  if (element) rows.current.set(item.id, element);
                  else rows.current.delete(item.id);
                }}
                className="reorder-row"
                data-moved={item.id === movedId ? "1" : "0"}
              >
                <button
                  type="button"
                  className="reorder-num"
                  aria-label={t("moveToAria", { n: index + 1 })}
                  onClick={() => setPickingId(item.id)}
                >
                  {index + 1}
                </button>
                <span className="reorder-text">
                  <span className="reorder-name" lang="de">{item.descriptionDe}</span>
                  <span className="reorder-amount">{formatMoney(item.totalAmount)}</span>
                </span>
                <button
                  type="button"
                  className="reorder-step"
                  aria-label={t("moveUp")}
                  disabled={index === 0}
                  onClick={() => apply(moveByOne(order, index, "up"), item.id)}
                >
                  <ArrowUp size={20} strokeWidth={2.2} aria-hidden />
                </button>
                <button
                  type="button"
                  className="reorder-step"
                  aria-label={t("moveDown")}
                  disabled={index === order.length - 1}
                  onClick={() => apply(moveByOne(order, index, "down"), item.id)}
                >
                  <ArrowDown size={20} strokeWidth={2.2} aria-hidden />
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="reorder-foot">
        {picking ? (
          <button type="button" className="reorder-cancel" onClick={() => setPickingId(null)}>
            {t("back")}
          </button>
        ) : (
          <>
            <button type="button" className="reorder-cancel" onClick={onClose}>
              {t("cancel")}
            </button>
            <button
              type="button"
              className="reorder-save"
              onClick={() => onSave(order.map((item) => item.id))}
            >
              <Check size={20} strokeWidth={2.4} aria-hidden />
              {t("done")}
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}
