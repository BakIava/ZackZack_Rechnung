"use client";

import { useTranslations } from "next-intl";
import type { DraftItem } from "@/types/document";
import "./position-number.css";

interface PositionNumberProps {
  item: DraftItem;
  index: number;
  disabled: boolean;
  /** Antippen → an eine andere Stelle verschieben; ohne = reine Anzeige. */
  onMoveTo?: ((item: DraftItem) => void) | null;
}

/** Positionsnummer – in der kompakten Zeile wie in der offenen Karte. */
export function PositionNumber({ item, index, disabled, onMoveTo }: PositionNumberProps) {
  const t = useTranslations("Step2");
  if (!onMoveTo) return <span className="position-number">{index + 1}</span>;
  const label = t("moveToAria", { n: index + 1 });
  return (
    <button
      type="button"
      className="position-number position-number--move"
      disabled={disabled}
      aria-label={label}
      title={label}
      onClick={() => onMoveTo(item)}
    >
      {index + 1}
    </button>
  );
}
