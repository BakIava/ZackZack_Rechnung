"use client";

import { AlertTriangle, Check } from "lucide-react";
import type { FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui";
import type { ServiceLocationInput } from "@/types/service-location";
import "./service-location-form.css";

const FIELDS = [
  { key: "name", autoComplete: "off", maxLength: 160 },
  { key: "street", autoComplete: "off", maxLength: 160 },
  { key: "houseNumber", autoComplete: "off", maxLength: 20 },
  { key: "postcode", autoComplete: "off", maxLength: 20 },
  { key: "city", autoComplete: "off", maxLength: 120 },
  { key: "addressExtra", autoComplete: "off", maxLength: 240 },
] as const;

interface ServiceLocationFormProps {
  value: ServiceLocationInput;
  notice: "ai-ok" | "ai-fail" | "ai-limit" | null;
  dailyLimit: number | null;
  saving: boolean;
  error: string | null;
  onChange: (value: ServiceLocationInput) => void;
  onApply: (value: ServiceLocationInput) => void;
  onClose: () => void;
  onRetry: () => void;
}

export function ServiceLocationForm({
  value, notice, dailyLimit, saving, error, onChange, onApply, onClose, onRetry,
}: ServiceLocationFormProps) {
  const t = useTranslations("ServiceLocation");
  const canApply = Boolean(value.name.trim() || value.street.trim() || value.city.trim());
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canApply) return;
    const trimmed = { ...value, sourceText: value.sourceText.trim() };
    for (const { key } of FIELDS) trimmed[key] = value[key].trim();
    onApply(trimmed);
  }
  return (
    <form className="location-form" onSubmit={submit}>
      <div className="location-form__body">
        {error && <p role="alert" className="location-form__error">{error}</p>}
        {notice && (
          <div className={`location-form__notice location-form__notice--${notice}`} role="status">
            {notice === "ai-ok" ? <Check size={18} aria-hidden /> : <AlertTriangle size={18} aria-hidden />}
            <span>{notice === "ai-ok" ? t("aiSuccess") : notice === "ai-limit"
              ? t("aiLimit", { limit: dailyLimit ?? 10 }) : t("aiFailure")}</span>
            {notice !== "ai-limit" && (
              <button type="button" onClick={onRetry}>{t("aiRetry")}</button>
            )}
          </div>
        )}
        <p className="location-form__hint">{t("formHint")}</p>
        {value.sourceText && (
          <details className="location-form__source" open>
            <summary>{t("yourInput")}</summary><p dir="auto">{value.sourceText}</p>
          </details>
        )}
        <div className="location-form__fields">
          {FIELDS.map(({ key, autoComplete, maxLength }, index) => (
            <label key={key} className={`location-form__field location-form__field--${key}`}>
              <span>{t(key)}</span>
              <Input touch value={value[key]} autoComplete={autoComplete} maxLength={maxLength}
                autoFocus={index === 0} dir="auto" placeholder={t(`${key}Placeholder`)}
                onChange={(event) => onChange({ ...value, [key]: event.target.value })} />
            </label>
          ))}
        </div>
      </div>
      <div className="location-form__footer">
        <button type="button" onClick={onClose} disabled={saving}>{t("cancel")}</button>
        <button type="submit" className="location-form__apply" disabled={!canApply || saving}>
          <Check size={20} aria-hidden />{t("apply")}
        </button>
      </div>
    </form>
  );
}
