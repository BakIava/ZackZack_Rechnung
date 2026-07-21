"use client";

import { CalendarDays, Loader2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { updateDraftServiceTiming } from "@/lib/documents/draft-actions";
import type { ServiceTimingInput, ServiceTimingMode } from "@/types/document";
import "./service-timing-field.css";

interface ServiceTimingFieldProps {
  documentId: string;
  initialServiceDate: string | null;
  initialPeriodStart: string | null;
  initialPeriodEnd: string | null;
}

function initialMode(props: ServiceTimingFieldProps): ServiceTimingMode {
  if (props.initialServiceDate) return "date";
  if (props.initialPeriodStart || props.initialPeriodEnd) return "period";
  return "none";
}

const EMPTY_TIMING: ServiceTimingInput = {
  serviceDate: null,
  servicePeriodStart: null,
  servicePeriodEnd: null,
};

export function ServiceTimingField(props: ServiceTimingFieldProps) {
  const t = useTranslations("Create");
  const [mode, setMode] = useState<ServiceTimingMode>(() => initialMode(props));
  const [serviceDate, setServiceDate] = useState(props.initialServiceDate ?? "");
  const [periodStart, setPeriodStart] = useState(props.initialPeriodStart ?? "");
  const [periodEnd, setPeriodEnd] = useState(props.initialPeriodEnd ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(timing: ServiceTimingInput) {
    setSaving(true);
    setError(null);
    const result = await updateDraftServiceTiming(props.documentId, timing);
    setSaving(false);
    if (result.error) {
      setError(
        result.error === "servicePeriodOrderInvalid"
          ? t("servicePeriodOrderInvalid")
          : t("serviceTimingSaveError"),
      );
    }
  }

  function chooseMode(next: Exclude<ServiceTimingMode, "none">) {
    if (next === mode) return;
    setMode(next);
    setError(null);
    if (next === "date") {
      setPeriodStart("");
      setPeriodEnd("");
    } else {
      setServiceDate("");
    }
    void save(EMPTY_TIMING);
  }

  function clearTiming() {
    setMode("none");
    setServiceDate("");
    setPeriodStart("");
    setPeriodEnd("");
    void save(EMPTY_TIMING);
  }

  function changeServiceDate(value: string) {
    setServiceDate(value);
    void save({
      serviceDate: value || null,
      servicePeriodStart: null,
      servicePeriodEnd: null,
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
      serviceDate: null,
      servicePeriodStart: start,
      servicePeriodEnd: end,
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
        <button
          type="button"
          disabled={saving}
          aria-pressed={mode === "date"}
          data-on={mode === "date" ? "1" : "0"}
          onClick={() => chooseMode("date")}
        >
          {t("serviceDate")}
        </button>
        <button
          type="button"
          disabled={saving}
          aria-pressed={mode === "period"}
          data-on={mode === "period" ? "1" : "0"}
          onClick={() => chooseMode("period")}
        >
          {t("servicePeriod")}
        </button>
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
    </section>
  );
}
