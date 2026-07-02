"use client";

import { Check, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { createCustomerForFlow } from "@/lib/flow/actions";
import type { FlowCustomer } from "@/lib/flow/types";
import "./NewCustomerInline.css";

interface NewCustomerInlineProps {
  onClose: () => void;
  onCreated: (customer: FlowCustomer) => void;
}

const STROKE = 1.75;

export function NewCustomerInline({ onClose, onCreated }: NewCustomerInlineProps) {
  const t = useTranslations("Create");
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [street, setStreet] = useState("");
  const [postcode, setPostcode] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);

  const canSubmit = name.trim().length > 0 && !isPending;

  function handleSubmit() {
    if (!canSubmit) return;
    startTransition(async () => {
      setServerError(null);
      const result = await createCustomerForFlow({
        name: name.trim(),
        street: street.trim() || undefined,
        postcode: postcode.trim() || undefined,
        city: city.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
      });

      if (result.error || !result.id) {
        setServerError(result.error ?? "unknownError");
        return;
      }

      onCreated({
        id: result.id,
        name: name.trim(),
        street: street.trim() || null,
        streetNo: null,
        postcode: postcode.trim() || null,
        city: city.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        customerNumber: 0,
      });
    });
  }

  return (
    <div className="nc-inline">
      <div className="nc-inline-head">
        <div>
          <div className="nc-inline-title">{t("ncTitle")}</div>
          <div className="nc-inline-sub">{t("ncSub")}</div>
        </div>
        <button
          type="button"
          className="nc-inline-close"
          aria-label={t("ncClose")}
          onClick={onClose}
        >
          <X size={18} strokeWidth={STROKE} aria-hidden />
        </button>
      </div>

      <div className="nc-fields">
        <label className="nc-field">
          <span className="nc-lbl">{t("ncName")}</span>
          <input
            className="nc-input"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("ncNamePh")}
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
        </label>

        <label className="nc-field">
          <span className="nc-lbl">{t("ncStreet")} <span className="nc-opt">{t("ncOptional")}</span></span>
          <input
            className="nc-input"
            autoComplete="street-address"
            value={street}
            onChange={(e) => setStreet(e.target.value)}
            placeholder={t("ncStreetPh")}
          />
        </label>

        <div className="nc-field-row">
          <label className="nc-field">
            <span className="nc-lbl">{t("ncZip")} <span className="nc-opt">{t("ncOptional")}</span></span>
            <input
              className="nc-input"
              inputMode="numeric"
              autoComplete="postal-code"
              value={postcode}
              onChange={(e) => setPostcode(e.target.value)}
              placeholder={t("ncZipPh")}
            />
          </label>
          <label className="nc-field">
            <span className="nc-lbl">{t("ncCity")} <span className="nc-opt">{t("ncOptional")}</span></span>
            <input
              className="nc-input"
              autoComplete="address-level2"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder={t("ncCityPh")}
            />
          </label>
        </div>

        <div className="nc-field-row">
          <label className="nc-field">
            <span className="nc-lbl">{t("ncPhone")} <span className="nc-opt">{t("ncOptional")}</span></span>
            <input
              className="nc-input"
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t("ncPhonePh")}
            />
          </label>
          <label className="nc-field">
            <span className="nc-lbl">{t("ncEmail")} <span className="nc-opt">{t("ncOptional")}</span></span>
            <input
              className="nc-input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("ncEmailPh")}
            />
          </label>
        </div>

        {serverError && (
          <p className="nc-error" role="alert">
            {serverError === "nameRequired" ? t("ncName") + " erforderlich." : serverError}
          </p>
        )}
      </div>

      <div className="nc-inline-foot">
        <button type="button" className="nc-cancel-btn" onClick={onClose} disabled={isPending}>
          {t("cancel")}
        </button>
        <button
          type="button"
          className="nc-create-btn"
          disabled={!canSubmit}
          onClick={handleSubmit}
        >
          <Check size={18} strokeWidth={2.4} aria-hidden />
          {isPending ? t("ncCreate") + " …" : t("ncCreate")}
        </button>
      </div>
    </div>
  );
}
