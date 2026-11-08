"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import "./position-add-end.css";

interface PositionAddEndProps {
  /** Noch keine Position: große Fläche statt schmaler Zeile. */
  empty: boolean;
  onAdd: () => void;
}

/**
 * Der einzige „Position hinzufügen"-Button: am Ende der Liste, dort, wo die
 * neue Position landet. Ohne Positionen ist der Leerzustand selbst der Button,
 * damit ein Klick in die leere Fläche nicht ins Leere geht.
 */
export function PositionAddEnd({ empty, onAdd }: PositionAddEndProps) {
  const t = useTranslations("Step2");

  if (empty) {
    return (
      <button
        type="button"
        className="d2-add-end d2-add-end--empty"
        onClick={onAdd}
        data-testid="step2-add-position"
      >
        <span className="d2-add-end-ic">
          <Plus size={30} strokeWidth={2.4} aria-hidden />
        </span>
        <span className="d2-add-end-t">{t("addFirstPosition")}</span>
        <span className="d2-add-end-s">{t("emptyPos")}</span>
      </button>
    );
  }

  return (
    <button type="button" className="d2-add-end" onClick={onAdd} data-testid="step2-add-position">
      <Plus size={20} strokeWidth={2.4} aria-hidden />
      {t("addPosition")}
    </button>
  );
}
