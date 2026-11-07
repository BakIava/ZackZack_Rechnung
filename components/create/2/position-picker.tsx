"use client";

import { useId } from "react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Modal } from "@/components/ui";
import type { DraftItem } from "@/types/document";
import "./position-picker.css";

const STROKE = 1.75;

interface PositionPickerProps {
  count: number;
  /** Aktuelle Stelle (1-basiert). */
  current: number;
  onPick: (position: number) => void;
}

/**
 * Raster 1..n: Zielstelle einer Position wählen – zwei Tipps für jede
 * Entfernung, auch bei 15 Positionen. Zahlen sind sprachunabhängig.
 */
export function PositionPicker({ count, current, onPick }: PositionPickerProps) {
  const t = useTranslations("Step2");
  return (
    <div className="position-picker" role="group" aria-label={t("moveToHint")}>
      {Array.from({ length: count }, (_, index) => index + 1).map((position) => (
        <button
          key={position}
          type="button"
          className="position-picker-num"
          aria-pressed={position === current}
          data-on={position === current ? "1" : "0"}
          onClick={() => {
            if (position !== current) onPick(position);
          }}
        >
          {position}
        </button>
      ))}
    </div>
  );
}

interface PositionPickerDialogProps {
  dir: "ltr" | "rtl";
  /** Alle Positionen in aktueller Reihenfolge. */
  items: DraftItem[];
  /** Die Position, deren Nummer angetippt wurde. */
  item: DraftItem;
  /** Zielstelle 1-basiert. */
  onPick: (item: DraftItem, position: number) => void;
  onClose: () => void;
}

/** Nummer auf der Positionskarte antippen → Stelle wählen → sofort verschoben. */
export function PositionPickerDialog({ dir, items, item, onPick, onClose }: PositionPickerDialogProps) {
  const t = useTranslations("Step2");
  const titleId = useId();
  return (
    <Modal open dir={dir} onClose={onClose} labelledBy={titleId} size="sm" className="position-picker-dialog">
      <div className="position-picker-head">
        <h2 id={titleId} className="position-picker-title">{t("moveToTitle")}</h2>
        <button type="button" className="position-picker-close" aria-label={t("close")} onClick={onClose}>
          <X size={20} strokeWidth={STROKE} aria-hidden />
        </button>
      </div>
      <div className="position-picker-body">
        <p className="position-picker-name" lang="de">{item.descriptionDe}</p>
        <p className="position-picker-hint">{t("moveToHint")}</p>
        <PositionPicker
          count={items.length}
          current={items.indexOf(item) + 1}
          onPick={(position) => onPick(item, position)}
        />
      </div>
    </Modal>
  );
}
