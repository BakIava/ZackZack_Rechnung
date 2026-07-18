"use client";

import { SetupIcon } from "./setup-icon";
import type { Translations } from "./translations";
import { Field, Seg3, TextInput } from "./setup-primitives";
import type { SetupFormData, SetupFormErrors } from "@/types/company";
import { TRADE_IDS, type TradeId } from "@/types/database";
import "./setup-company-fields.css";

interface SetupCompanyFieldsProps {
  t: Translations;
  formData: SetupFormData;
  errors: SetupFormErrors;
  onChange: <K extends keyof SetupFormData>(
    key: K,
    value: SetupFormData[K],
  ) => void;
  tradeLabels: Record<TradeId, string>;
}

export function SetupCompanyFields({
  t,
  formData,
  errors,
  onChange,
  tradeLabels,
}: SetupCompanyFieldsProps) {
  const registeredLegalForms = new Set(["ek", "gmbh", "ug"]);
  const showRegisterFields = registeredLegalForms.has(formData.legal_form);

  return (
    <div className="ob-form">
      <Field fieldName="name" label={t.firma} req error={errors.name}>
        <TextInput
          name="name"
          value={formData.name}
          onChange={(value) => onChange("name", value)}
          error={Boolean(errors.name)}
          placeholder="z. B. Yılmaz Malerbetrieb"
        />
      </Field>
      <Field fieldName="director" label={t.director} req error={errors.director}>
        <TextInput
          name="director"
          value={formData.director}
          onChange={(value) => onChange("director", value)}
          placeholder="z. B. Mehmet Yılmaz"
          error={Boolean(errors.director)}
        />
      </Field>
      <Field
        fieldName="legal_form"
        label={t.rechtsform}
        req
        error={errors.legal_form}
      >
        <Seg3
          options={t.rf}
          value={formData.legal_form}
          onChange={(value) => onChange("legal_form", value)}
          wrap
          error={Boolean(errors.legal_form)}
        />
      </Field>
      {showRegisterFields && (
        <div className="ob-hr-fields">
          <div className="ob-row2">
            <div className="ob-grow">
              <Field
                fieldName="handelsregister_nr"
                label={t.hrNr}
                req
                error={errors.handelsregister_nr}
              >
                <TextInput
                  name="handelsregister_nr"
                  value={formData.handelsregister_nr}
                  onChange={(value) => onChange("handelsregister_nr", value)}
                  placeholder={t.hrNrPh}
                  mono
                  error={Boolean(errors.handelsregister_nr)}
                />
              </Field>
            </div>
            <div className="ob-grow">
              <Field
                fieldName="registergericht"
                label={t.hrGericht}
                req
                error={errors.registergericht}
              >
                <TextInput
                  name="registergericht"
                  value={formData.registergericht}
                  onChange={(value) => onChange("registergericht", value)}
                  placeholder={t.hrGerichtPh}
                  error={Boolean(errors.registergericht)}
                />
              </Field>
            </div>
          </div>
        </div>
      )}
      <div className="ob-row2">
        <div className="ob-grow">
          <Field fieldName="street" label={t.strasse} req error={errors.street}>
            <TextInput
              name="street"
              value={formData.street}
              onChange={(value) => onChange("street", value)}
              placeholder="Hansastraße"
              error={Boolean(errors.street)}
            />
          </Field>
        </div>
        <div className="ob-hnr">
          <Field fieldName="street_no" label={t.hausnr} req error={errors.street_no}>
            <TextInput
              name="street_no"
              value={formData.street_no}
              onChange={(value) => onChange("street_no", value)}
              placeholder="22"
              error={Boolean(errors.street_no)}
            />
          </Field>
        </div>
      </div>
      <div className="ob-row2">
        <div className="ob-plz">
          <Field fieldName="postcode" label={t.plz} req error={errors.postcode}>
            <TextInput
              name="postcode"
              value={formData.postcode}
              onChange={(value) => onChange("postcode", value)}
              placeholder="60314"
              error={Boolean(errors.postcode)}
            />
          </Field>
        </div>
        <div className="ob-grow">
          <Field fieldName="city" label={t.ort} req error={errors.city}>
            <TextInput
              name="city"
              value={formData.city}
              onChange={(value) => onChange("city", value)}
              placeholder="Frankfurt am Main"
              error={Boolean(errors.city)}
            />
          </Field>
        </div>
      </div>
      <TradeSelect
        t={t}
        labels={tradeLabels}
        selected={formData.trade_ids}
        error={errors.trade_ids}
        onChange={(tradeIds) => onChange("trade_ids", tradeIds)}
      />
    </div>
  );
}

interface TradeSelectProps {
  t: Translations;
  labels: Record<TradeId, string>;
  selected: TradeId[];
  error?: string;
  onChange: (tradeIds: TradeId[]) => void;
}

function TradeSelect({ t, labels, selected, error, onChange }: TradeSelectProps) {
  const selectedIds = new Set(selected);
  const toggle = (id: TradeId) => {
    onChange(
      selectedIds.has(id)
        ? selected.filter((tradeId) => tradeId !== id)
        : [...selected, id],
    );
  };

  return (
    <div
      className="ob-gewerk"
      data-invalid={error ? "true" : "false"}
      data-setup-field="trade_ids"
    >
      <div className="ob-gewerk-head">
        <div className="ob-gewerk-t">
          {t.gewerk_t}
          <span className="ob-badge ob-badge--req">{t.req}</span>
        </div>
        <div className="ob-gewerk-s">{t.gewerk_s}</div>
      </div>
      <div
        className="ob-trades"
        role="group"
        aria-describedby={error ? "trade_ids-error" : undefined}
      >
        {TRADE_IDS.map((id) => {
          const active = selectedIds.has(id);
          return (
            <button
              type="button"
              key={id}
              className="ob-trade"
              data-active={active ? "true" : "false"}
              aria-pressed={active}
              onClick={() => toggle(id)}
            >
              <span className="ob-trade-box">
                <SetupIcon name="check" size={15} weight="bold" />
              </span>
              <span className="ob-trade-lbl">{labels[id]}</span>
            </button>
          );
        })}
      </div>
      {error && (
        <div className="ob-gewerk-error" id="trade_ids-error" role="alert">
          <SetupIcon name="alert" size={14} />
          {error}
        </div>
      )}
    </div>
  );
}
