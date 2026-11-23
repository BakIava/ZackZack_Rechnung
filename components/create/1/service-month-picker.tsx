"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { todayInGermany } from "@/lib/documents/document-dates";
import "./service-month-picker.css";

interface ServiceMonthPickerProps {
  dir: "ltr" | "rtl";
  /** Erster Tag des gewählten Monats (YYYY-MM-01), leer ohne Auswahl. */
  value: string;
  disabled: boolean;
  onSelect: (monthStart: string) => void;
}

function monthStartIso(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

/** Monatsersten um `delta` Monate verschieben (über Jahresgrenzen hinweg). */
function shiftMonth(year: number, month: number, delta: number): string {
  const index = year * 12 + (month - 1) + delta;
  return monthStartIso(Math.floor(index / 12), (index % 12) + 1);
}

/**
 * Kompakter Monatsschalter „‹ November 2026 ›“; jeder Schritt wählt den Monat.
 * Monatsname in der Bediensprache – aufs Dokument kommt unabhängig davon der
 * deutsche Monatsname.
 */
export function ServiceMonthPicker({ dir, value, disabled, onSelect }: ServiceMonthPickerProps) {
  const t = useTranslations("Create");
  const locale = useLocale();
  const current = value || todayInGermany();
  const year = Number(current.slice(0, 4));
  const month = Number(current.slice(5, 7));
  const monthName = new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, 1)),
  );
  const PrevIcon = dir === "rtl" ? ChevronRight : ChevronLeft;
  const NextIcon = dir === "rtl" ? ChevronLeft : ChevronRight;

  return (
    <div className="service-month" role="group" aria-label={t("serviceMonth")}>
      <button
        type="button"
        disabled={disabled}
        aria-label={t("serviceMonthPrev")}
        onClick={() => onSelect(shiftMonth(year, month, -1))}
      >
        <PrevIcon size={20} strokeWidth={2} aria-hidden />
      </button>
      <span className="service-month-value" aria-live="polite">
        {monthName} {year}
      </span>
      <button
        type="button"
        disabled={disabled}
        aria-label={t("serviceMonthNext")}
        onClick={() => onSelect(shiftMonth(year, month, 1))}
      >
        <NextIcon size={20} strokeWidth={2} aria-hidden />
      </button>
    </div>
  );
}
