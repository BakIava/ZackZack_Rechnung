"use client";

import { useEffect, useRef } from "react";
import type { DraftItem, TaxRate } from "@/types/document";
import type { PadField } from "./number-pad";
import { PositionCard } from "./position-card";
import { PositionRow } from "./position-row";
import { usePositionExpansion } from "./use-position-expansion";
import "./position-list.css";

interface PositionListProps {
  items: DraftItem[];
  disabled: boolean;
  /** Beim Draft eingefrorener Dokumentstandard (bei §19: 0 %). */
  companyVat: TaxRate;
  onOpenPad: (item: DraftItem, field: PadField) => void;
  onEditDesc: (item: DraftItem) => void;
  onEditAdditionalDescription: (item: DraftItem) => void;
  onEditUnit: (item: DraftItem) => void;
  onEditVat: (item: DraftItem) => void;
  onDelete: (id: string) => void;
  /** Nummer antippen → verschieben; null bei nur einer Position. */
  onMoveTo: ((item: DraftItem) => void) | null;
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Positionen in Schritt 2: alle als kompakte Zeile, höchstens eine aufgeklappt
 * zum Bearbeiten. So bleiben auch 15 Positionen übersichtlich.
 */
export function PositionList({
  items,
  disabled,
  companyVat,
  onOpenPad,
  onEditDesc,
  onEditAdditionalDescription,
  onEditUnit,
  onEditVat,
  onDelete,
  onMoveTo,
}: PositionListProps) {
  const { expandedId, toggle, collapse } = usePositionExpansion(items.map((item) => item.id));
  const nodes = useRef(new Map<string, HTMLDivElement>());

  // Die aufgeklappte Position sichtbar halten: oberhalb klappt gleichzeitig eine
  // andere zu, und eine neue Position landet ganz unten.
  useEffect(() => {
    if (!expandedId) return;
    nodes.current.get(expandedId)?.scrollIntoView({
      block: "nearest",
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  }, [expandedId]);

  return (
    <div className="d2cards">
      {items.map((item, index) => {
        const expanded = item.id === expandedId;
        const vat = item.taxRateOverridden ? item.taxRate : null;
        return (
          <div
            key={item.id}
            ref={(element) => {
              if (element) nodes.current.set(item.id, element);
              else nodes.current.delete(item.id);
            }}
            className="d2card"
            data-expanded={expanded ? "1" : "0"}
          >
            {expanded ? (
              <PositionCard
                item={item}
                index={index}
                disabled={disabled}
                vat={vat}
                companyVat={companyVat}
                onOpenPad={onOpenPad}
                onEditDesc={onEditDesc}
                onEditAdditionalDescription={onEditAdditionalDescription}
                onEditUnit={onEditUnit}
                onEditVat={onEditVat}
                onDelete={onDelete}
                onMoveTo={onMoveTo}
                onCollapse={collapse}
              />
            ) : (
              <PositionRow
                item={item}
                index={index}
                disabled={disabled}
                vat={vat}
                onExpand={toggle}
                onMoveTo={onMoveTo}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
