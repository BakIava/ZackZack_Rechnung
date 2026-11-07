"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { filterUnits } from "@/lib/documents/units";
import "./unit-picker.css";

interface UnitPickerProps {
  id?: string;
  units: readonly string[];
  value: string;
  searchPlaceholder: string;
  noResultsLabel: string;
  onChange: (unit: string) => void;
}

const STROKE = 1.75;
const POPOVER_GAP = 6;
const VIEWPORT_MARGIN = 12;
const MIN_POPOVER_HEIGHT = 140;

/**
 * Richtet das Popover (position: fixed) direkt unter dem Auslöser aus. Fixed
 * statt absolute, damit es nicht vom overflow eines Modals abgeschnitten wird;
 * es bleibt im DOM-Baum und erbt so Design-Tokens und Leserichtung.
 */
function placePopover(trigger: HTMLElement, popover: HTMLElement) {
  const rect = trigger.getBoundingClientRect();
  const viewport = document.documentElement;
  // Logische Insets eines fixed-Elements richten sich nach der Leserichtung des Viewports (<html dir>).
  const start = getComputedStyle(viewport).direction === "rtl"
    ? viewport.clientWidth - rect.right
    : rect.left;
  const top = rect.bottom + POPOVER_GAP;
  const maxHeight = Math.max(viewport.clientHeight - top - VIEWPORT_MARGIN, MIN_POPOVER_HEIGHT);
  popover.style.setProperty("--unit-picker-top", `${top}px`);
  popover.style.setProperty("--unit-picker-start", `${start}px`);
  popover.style.setProperty("--unit-picker-width", `${rect.width}px`);
  popover.style.setProperty("--unit-picker-max-height", `${maxHeight}px`);
}

/** Geschlossene Einheiten-Auswahl mit Filter; es werden nur vorhandene Werte übernommen. */
export function UnitPicker({
  id,
  units,
  value,
  searchPlaceholder,
  noResultsLabel,
  onChange,
}: UnitPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const generatedId = useId();
  const listId = `${generatedId}-list`;
  const filteredUnits = filterUnits(units, query);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // Vor dem ersten Zeichnen ausrichten; Scrollen (auch im Modal-Body) und
  // Größenänderungen verschieben den Auslöser und werden nachgeführt.
  useLayoutEffect(() => {
    const trigger = triggerRef.current;
    const popover = popoverRef.current;
    if (!open || !trigger || !popover) return;
    const update = () => placePopover(trigger, popover);
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    searchRef.current?.focus({ preventScroll: true });
  }, [open]);

  function select(unit: string) {
    onChange(unit);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="unit-picker" data-open={open ? "1" : "0"}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        className="unit-picker-trigger"
        aria-expanded={open}
        aria-controls={listId}
        aria-haspopup="listbox"
        onClick={() => setOpen((current) => !current)}
      >
        <span>{value}</span>
        <ChevronDown size={17} strokeWidth={STROKE} aria-hidden />
      </button>

      {open && (
        <div ref={popoverRef} className="unit-picker-popover">
          <div className="unit-picker-search">
            <Search size={17} strokeWidth={STROKE} aria-hidden />
            <input
              ref={searchRef}
              type="search"
              value={query}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              onChange={(event) => setQuery(event.target.value)}
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} aria-label={searchPlaceholder}>
                <X size={15} strokeWidth={STROKE} aria-hidden />
              </button>
            )}
          </div>

          <div id={listId} className="unit-picker-list" role="listbox">
            {filteredUnits.length === 0 ? (
              <div className="unit-picker-empty">{noResultsLabel}</div>
            ) : (
              filteredUnits.map((unit) => (
                <button
                  key={unit}
                  type="button"
                  className="unit-picker-option"
                  role="option"
                  aria-selected={unit === value}
                  onClick={() => select(unit)}
                >
                  <span>{unit}</span>
                  {unit === value && <Check size={16} strokeWidth={2.4} aria-hidden />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
