"use client";

import { CalendarDays, Loader2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { updateDraftServiceTiming } from "@/lib/documents/draft-actions";
import { calendarMonthBounds, todayInGermany } from "@/lib/documents/document-dates";
import type { ServiceTimingInput, ServiceTimingMode } from "@/types/document";
import { ServiceMonthPicker } from "./service-month-picker";
import "./service-timing-field.css";

interface ServiceTimingFieldProps {
  dir: "ltr" | "rtl";
  documentId: string;
  initialTiming: ServiceTimingInput;
}

function initialMode(timing: ServiceTimingInput): ServiceTimingMode {
  if (timing.serviceDate) return "date";
  if (timing.servicePeriodIsMonth) return "month";
  if (timing.servicePeriodStart || timing.servicePeriodEnd) return "period";
  return "none";
}

const EMPTY_TIMING: ServiceTimingInput = {
  serviceDate: null,
  servicePeriodStart: null,
  servicePeriodEnd: null,
  servicePeriodIsMonth: false,
};

const MODES = [
  { mode: "date", labelKey: "serviceDate" },
  { mode: "period", labelKey: "servicePeriod" },
  { mode: "month", labelKey: "serviceMonth" },
] as const;

export function ServiceTimingField({ dir, documentId, initialTiming }: ServiceTimingFieldProps) {
  const t = useTranslations("Create");
  const initialIsMonth = initialTiming.servicePeriodIsMonth;
  const [mode, setMode] = useState<ServiceTimingMode>(() => initialMode(initialTiming));
  const [serviceDate, setServiceDate] = useState(initialTiming.serviceDate ?? "");
  const [periodStart, setPeriodStart] = useState(
    initialIsMonth ? "" : (initialTiming.servicePeriodStart ?? ""),
  );
  const [periodEnd, setPeriodEnd] = useState(
    initialIsMonth ? "" : (initialTiming.servicePeriodEnd ?? ""),
  );
  const [monthStart, setMonthStart] = useState(
    initialIsMonth ? (initialTiming.servicePeriodStart ?? "") : "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(timing: ServiceTimingInput) {
    setSaving(true);
    setError(null);
    const result = await updateDraftServiceTiming(documentId, timing);
    setSaving(false);
    if (result.error) {
      setError(
        result.error === "servicePeriodOrderInvalid"
          ? t("servicePeriodOrderInvalid")
          : t("serviceTimingSaveError"),
      );
    }
  }

  function resetValues() {
    setServiceDate("");
    setPeriodStart("");
    setPeriodEnd("");
    setMonthStart("");
  }

  function chooseMode(next: Exclude<ServiceTimingMode, "none">) {
    if (next === mode) return;
    setMode(next);
    setError(null);
    resetValues();
    // Leistungsmonat startet mit dem aktuellen Monat – ein Tipp genügt.
    if (next === "month") {
      selectMonth(todayInGermany());
      return;
    }
    void save(EMPTY_TIMING);
  }

  function clearTiming() {
    setMode("none");
    resetValues();
    void save(EMPTY_TIMING);
  }

  function changeServiceDate(value: string) {
    setServiceDate(value);
    void save({
      ...EMPTY_TIMING,
      serviceDate: value || null,
    });
  }

  function changePeriod(start: string, end: string) {
    setPeriodStart(start);
    setPeriodEnd(end);
    setError(null);
    if (!start || !end) return;
    if (start > end) {
      setError(t("servicePeriodOrderInvalid"));
      return;
    }
    void save({
      ...EMPTY_TIMING,
      servicePeriodStart: start,
      servicePeriodEnd: end,
    });
  }

  function selectMonth(isoDate: string) {
    const { start, end } = calendarMonthBounds(isoDate);
    setMonthStart(start);
    void save({
      serviceDate: null,
      servicePeriodStart: start,
      servicePeriodEnd: end,
      servicePeriodIsMonth: true,
    });
  }

  return (
    <section className="service-timing" aria-labelledby="service-timing-title">
      <div className="service-timing-head">
        <span className="service-timing-icon">
          <CalendarDays size={21} strokeWidth={1.75} aria-hidden />
        </span>
        <span className="service-timing-copy">
          <span className="service-timing-title" id="service-timing-title">
            {t("serviceTimingTitle")}
          </span>
          <span className="service-timing-hint">
            {error ?? t("serviceTimingOptional")}
          </span>
        </span>
        {saving && <Loader2 size={17} className="service-timing-spinner" aria-hidden />}
        {mode !== "none" && (
          <button
            type="button"
            className="service-timing-clear"
            disabled={saving}
            onClick={clearTiming}
          >
            <X size={16} strokeWidth={2} aria-hidden />
            {t("serviceTimingClear")}
          </button>
        )}
      </div>

      <div className="service-timing-modes" role="group" aria-label={t("serviceTimingTitle")}>
        {MODES.map((option) => (
          <button
            key={option.mode}
            type="button"
            disabled={saving}
            aria-pressed={mode === option.mode}
            data-on={mode === option.mode ? "1" : "0"}
            onClick={() => chooseMode(option.mode)}
          >
            {t(option.labelKey)}
          </button>
        ))}
      </div>

      {mode === "date" && (
        <label className="service-timing-date">
          <span>{t("serviceDate")}</span>
          <input
            type="date"
            disabled={saving}
            value={serviceDate}
            aria-invalid={Boolean(error)}
            onChange={(event) => changeServiceDate(event.target.value)}
          />
        </label>
      )}

      {mode === "period" && (
        <div className="service-timing-period">
          <label>
            <span>{t("servicePeriodFrom")}</span>
            <input
              type="date"
              disabled={saving}
              value={periodStart}
              max={periodEnd || undefined}
              aria-invalid={Boolean(error)}
              onChange={(event) => changePeriod(event.target.value, periodEnd)}
            />
          </label>
          <label>
            <span>{t("servicePeriodTo")}</span>
            <input
              type="date"
              disabled={saving}
              value={periodEnd}
              min={periodStart || undefined}
              aria-invalid={Boolean(error)}
              onChange={(event) => changePeriod(periodStart, event.target.value)}
            />
          </label>
        </div>
      )}

      {mode === "month" && (
        <ServiceMonthPicker
          dir={dir}
          value={monthStart}
          disabled={saving}
          onSelect={selectMonth}
        />
      )}
    </section>
  );
}
