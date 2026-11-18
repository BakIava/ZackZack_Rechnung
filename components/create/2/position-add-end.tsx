"use client";

import { Plus, ScanLine } from "lucide-react";
import { useTranslations } from "next-intl";
import "./position-add-end.css";

interface PositionAddEndProps {
  /** Noch keine Position: zwei große Wege statt schmaler Zeile. */
  empty: boolean;
  onAdd: () => void;
  /** Öffnet den Dialog direkt im Reiter „Nachweis“. */
  onAddNachweis: () => void;
}

/**
 * „Position hinzufügen" am Ende der Liste, dort, wo die neue Position landet.
 * Ohne Positionen bietet der Leerzustand beide Wege direkt an – manuell oder
 * mit Nachweis –, damit niemand erst im Dialog den Reiter wechseln muss.
 */
export function PositionAddEnd({ empty, onAdd, onAddNachweis }: PositionAddEndProps) {
  const t = useTranslations("Step2");

  if (empty) {
    return (
      <div className="d2-add-first">
        <span className="d2-add-first-t">{t("addFirstPosition")}</span>
        <div className="d2-add-first-choices">
          <button
            type="button"
            className="d2-add-end d2-add-end--empty"
            onClick={onAdd}
            data-testid="step2-add-position"
          >
            <span className="d2-add-end-ic">
              <Plus size={30} strokeWidth={2.4} aria-hidden />
            </span>
            <span className="d2-add-end-t">{t("addFirstManual")}</span>
          </button>
          <button
            type="button"
            className="d2-add-end d2-add-end--empty"
            onClick={onAddNachweis}
            data-testid="step2-add-nachweis"
          >
            <span className="d2-add-end-ic">
              <ScanLine size={28} strokeWidth={2.2} aria-hidden />
            </span>
            <span className="d2-add-end-t">{t("addFirstNachweis")}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <button type="button" className="d2-add-end" onClick={onAdd} data-testid="step2-add-position">
      <Plus size={20} strokeWidth={2.4} aria-hidden />
      {t("addPosition")}
    </button>
  );
}
