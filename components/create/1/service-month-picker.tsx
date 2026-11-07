"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { todayInGermany } from "@/lib/documents/document-dates";
import "./service-month-picker.css";

interface ServiceMonthPickerProps {
  dir: "ltr" | "rtl";
  /** Erster Tag des gewählten Monats (YYYY-MM-01), leer ohne Auswahl. */
  value: string;
  disabled: boolean;
  onSelect: (monthStart: string) => void;
}

const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);

function monthStartIso(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

/**
 * Monatsraster mit Jahresumschalter. Monatsnamen in der Bediensprache –
 * aufs Dokument kommt unabhängig davon der deutsche Monatsname.
 */
export function ServiceMonthPicker({ dir, value, disabled, onSelect }: ServiceMonthPickerProps) {
  const t = useTranslations("Create");
  const locale = useLocale();
  const [year, setYear] = useState(() => Number((value || todayInGermany()).slice(0, 4)));
  const monthName = new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" });
  const PrevIcon = dir === "rtl" ? ChevronRight : ChevronLeft;
  const NextIcon = dir === "rtl" ? ChevronLeft : ChevronRight;

  return (
    <div className="service-month">
      <div className="service-month-year">
        <button
          type="button"
          aria-label={t("serviceMonthPrevYear")}
          onClick={() => setYear(year - 1)}
        >
          <PrevIcon size={20} strokeWidth={2} aria-hidden />
        </button>
        <span className="service-month-year-value" aria-live="polite">{year}</span>
        <button
          type="button"
          aria-label={t("serviceMonthNextYear")}
          onClick={() => setYear(year + 1)}
        >
          <NextIcon size={20} strokeWidth={2} aria-hidden />
        </button>
      </div>

      <div className="service-month-grid" role="group" aria-label={t("serviceMonth")}>
        {MONTHS.map((month) => {
          const start = monthStartIso(year, month);
          const selected = value === start;
          return (
            <button
              key={month}
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              data-on={selected ? "1" : "0"}
              onClick={() => {
                if (!selected) onSelect(start);
              }}
            >
              {monthName.format(new Date(Date.UTC(year, month - 1, 1)))}
            </button>
          );
        })}
      </div>
    </div>
  );
}
