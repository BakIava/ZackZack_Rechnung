"use client";

import "./setup-step-fields.css";
import { useRef, type ChangeEvent } from "react";
import { SetupIcon } from "./setup-icon";
import { type Translations } from "./translations";
import { Field, TextInput, Seg3, Toggle19 } from "./setup-primitives";
import type { SetupFormData, SetupFormErrors } from "@/types/company";
import { TRADE_IDS, type TradeId } from "@/types/database";
import { COMPANY_LOGO_ACCEPT } from "@/lib/company-logo/constants";

interface StepProps {
  t: Translations;
  formData: SetupFormData;
  errors: SetupFormErrors;
  onChange: <K extends keyof SetupFormData>(key: K, value: SetupFormData[K]) => void;
  tradeLabels: Record<TradeId, string>;
}

// ── Step1Fields ───────────────────────────────────────────────────────────────

export function Step1Fields({ t, formData, errors, onChange, tradeLabels }: StepProps) {
  const HR_FORMS = new Set(["ek", "gmbh", "ug"]);
  const showHr = HR_FORMS.has(formData.legal_form);
  return (
    <div className="ob-form">
      <Field label={t.firma} req error={errors.name}>
        <TextInput
          value={formData.name}
          onChange={(v) => onChange("name", v)}
          error={!!errors.name}
          placeholder="z. B. Yılmaz Malerbetrieb"
        />
      </Field>
      <Field label={t.director} req error={errors.director}>
        <TextInput
          value={formData.director}
          onChange={(v) => onChange("director", v)}
          placeholder="z. B. Mehmet Yılmaz"
          error={!!errors.director}
        />
      </Field>
      <Field label={t.rechtsform} req>
        <Seg3
          options={t.rf}
          value={formData.legal_form}
          onChange={(v) => onChange("legal_form", v)}
          wrap
        />
      </Field>
      {showHr && (
        <div className="ob-hr-fields">
          <div className="ob-row2">
            <div className="ob-grow">
              <Field label={t.hrNr} req>
                <TextInput
                  value={formData.handelsregister_nr}
                  onChange={(v) => onChange("handelsregister_nr", v)}
                  placeholder={t.hrNrPh}
                  mono
                />
              </Field>
            </div>
            <div className="ob-grow">
              <Field label={t.hrGericht} req>
                <TextInput
                  value={formData.registergericht}
                  onChange={(v) => onChange("registergericht", v)}
                  placeholder={t.hrGerichtPh}
                />
              </Field>
            </div>
          </div>
        </div>
      )}
      <div className="ob-row2">
        <div className="ob-grow">
          <Field label={t.strasse} req>
            <TextInput
              value={formData.street}
              onChange={(v) => onChange("street", v)}
              placeholder="Hansastraße"
            />
          </Field>
        </div>
        <div className="ob-hnr">
          <Field label={t.hausnr} req>
            <TextInput
              value={formData.street_no}
              onChange={(v) => onChange("street_no", v)}
              placeholder="22"
            />
          </Field>
        </div>
      </div>
      <div className="ob-row2">
        <div className="ob-plz">
          <Field label={t.plz} req>
            <TextInput
              value={formData.postcode}
              onChange={(v) => onChange("postcode", v)}
              placeholder="60314"
            />
          </Field>
        </div>
        <div className="ob-grow">
          <Field label={t.ort} req>
            <TextInput
              value={formData.city}
              onChange={(v) => onChange("city", v)}
              placeholder="Frankfurt am Main"
            />
          </Field>
        </div>
      </div>
      <GewerkSelect
        t={t}
        labels={tradeLabels}
        selected={formData.trade_ids}
        error={errors.trade_ids}
        onChange={(tradeIds) => onChange("trade_ids", tradeIds)}
      />
    </div>
  );
}

// ── GewerkSelect ────────────────────────────────────────────────────────────────
interface GewerkSelectProps {
  t: Translations;
  labels: Record<TradeId, string>;
  selected: TradeId[];
  error?: string;
  onChange: (tradeIds: TradeId[]) => void;
}

function GewerkSelect({ t, labels, selected, error, onChange }: GewerkSelectProps) {
  const selectedIds = new Set(selected);
  const toggle = (id: TradeId) => {
    if (selectedIds.has(id)) {
      onChange(selected.filter((tradeId) => tradeId !== id));
      return;
    }
    onChange([...selected, id]);
  };
  return (
    <div className="ob-gewerk" data-invalid={error ? "true" : "false"}>
      <div className="ob-gewerk-head">
        <div className="ob-gewerk-t">
          {t.gewerk_t}
          <span className="ob-badge ob-badge--req">{t.req}</span>
        </div>
        <div className="ob-gewerk-s">{t.gewerk_s}</div>
      </div>
      <div className="ob-trades">
        {TRADE_IDS.map((id) => {
          const on = selectedIds.has(id);
          return (
            <button
              type="button"
              key={id}
              className="ob-trade"
              data-active={on ? "true" : "false"}
              aria-pressed={on}
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
      {error && <div className="ob-gewerk-error" role="alert">{error}</div>}
    </div>
  );
}

// ── Step2Fields ───────────────────────────────────────────────────────────────

export function Step2Fields({ t, formData, errors, onChange }: StepProps) {
  const optBadge = <span className="ob-opt">{t.opt}</span>;
  return (
    <div className="ob-form">
      <Field label={t.email} req hint={t.emailHint} error={errors.email}>
        <TextInput
          value={formData.email}
          onChange={(v) => onChange("email", v)}
          placeholder="mehmet@example.de"
          dir="ltr"
          error={!!errors.email}
        />
      </Field>
      <div className="ob-row2">
        <div className="ob-grow">
          <Field label={t.telefon} badge={optBadge}>
            <TextInput
              value={formData.phone}
              onChange={(v) => onChange("phone", v)}
              placeholder="069 1234567"
              dir="ltr"
            />
          </Field>
        </div>
        <div className="ob-grow">
          <Field label={t.mobil} badge={optBadge}>
            <TextInput
              value={formData.mobile}
              onChange={(v) => onChange("mobile", v)}
              placeholder="0151 23456789"
              dir="ltr"
            />
          </Field>
        </div>
      </div>
      <Field label={t.fax} badge={optBadge}>
        <TextInput
          value={formData.fax}
          onChange={(v) => onChange("fax", v)}
          placeholder={t.faxPh}
          dir="ltr"
        />
      </Field>
      <div className="ob-note">
        <div className="ob-note-ic"><SetupIcon name="info" size={18} /></div>
        <div className="ob-note-tx">{t.contactNote}</div>
      </div>
    </div>
  );
}

function formatSteuernummer(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}/${digits.slice(3)}`;
  return `${digits.slice(0, 3)}/${digits.slice(3, 6)}/${digits.slice(6)}`;
}

// ── Step3Fields ───────────────────────────────────────────────────────────────

export function Step3Fields({ t, formData, errors, onChange }: StepProps) {
  const optBadge = <span className="ob-opt">{t.opt}</span>;
  return (
    <div className="ob-form">
      <Field
        label={t.steuernr}
        req
        hint={<><span>{t.steuernrHint}</span><span className="mono">123/456/78901</span></>}
        error={errors.steuernummer}
      >
        <TextInput
          value={formData.steuernummer}
          onChange={(v) => onChange("steuernummer", formatSteuernummer(v))}
          placeholder="047/815/08150"
          mono
          dir="ltr"
          error={!!errors.steuernummer}
        />
      </Field>
      <Field label={t.ustidnr} badge={optBadge}>
        <TextInput
          value={formData.ust_id}
          onChange={(v) => onChange("ust_id", v)}
          placeholder="DE123456789"
          mono
          dir="ltr"
        />
      </Field>
      <Toggle19
        t={t}
        checked={formData.kleinunternehmer}
        onChange={(v) => onChange("kleinunternehmer", v)}
      />
    </div>
  );
}

// ── Step4Fields ───────────────────────────────────────────────────────────────

export function Step4Fields({ t, formData, errors, onChange }: StepProps) {
  return (
    <div className="ob-form">
      <Field label={t.iban} error={errors.iban}>
        <TextInput
          value={formData.iban}
          onChange={(v) => onChange("iban", v)}
          placeholder="DE89 3704 0044 0532 0130 00"
          mono
          dir="ltr"
          error={!!errors.iban}
        />
      </Field>
      <div className="ob-row2">
        <div className="ob-grow">
          <Field label={t.bic}>
            <TextInput
              value={formData.bic}
              onChange={(v) => onChange("bic", v)}
              placeholder="COBADEFFXXX"
              mono
              dir="ltr"
            />
          </Field>
        </div>
        <div className="ob-grow">
          <Field label={t.bankName}>
            <TextInput
              value={formData.bank_name}
              onChange={(v) => onChange("bank_name", v)}
              placeholder="Commerzbank"
            />
          </Field>
        </div>
      </div>
      <Field label={t.inhaber}>
        <TextInput
          value={formData.account_holder}
          onChange={(v) => onChange("account_holder", v)}
          placeholder="Mehmet Yılmaz"
        />
      </Field>
      <div className="ob-note">
        <div className="ob-note-ic"><SetupIcon name="info" size={18} /></div>
        <div className="ob-note-tx">{t.bankNote}</div>
      </div>
    </div>
  );
}

// ── LogoField ─────────────────────────────────────────────────────────────────

interface LogoFieldProps {
  t: Translations;
  file: File | null;
  previewUrl: string | null;
  statusLabel: string;
  errorMessage: string | null;
  isMobile: boolean;
  onSelect: (file: File) => void;
  onRemove: () => void;
}

export function LogoField({
  t,
  file,
  previewUrl,
  statusLabel,
  errorMessage,
  isMobile,
  onSelect,
  onRemove,
}: LogoFieldProps) {
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    event.target.value = "";
    if (selected) onSelect(selected);
  }

  if (!file || !previewUrl) {
    return (
      <div className="ob-form">
        <div className="ob-upload">
          <button
            type="button"
            className="ob-upload-main"
            onClick={() => galleryInputRef.current?.click()}
          >
            <span className="ob-upload-ic"><SetupIcon name="image" size={26} /></span>
            <span className="ob-upload-t">{t.uploadT}</span>
            <span className="ob-upload-s">{t.uploadS}</span>
          </button>
          <div className="ob-upload-ways">
            {isMobile && (
              <button
                type="button"
                className="ob-upload-way"
                onClick={() => cameraInputRef.current?.click()}
              >
                <SetupIcon name="camera" size={17} />{t.wayCam}
              </button>
            )}
            <button
              type="button"
              className="ob-upload-way"
              onClick={() => galleryInputRef.current?.click()}
            >
              <SetupIcon name="image" size={17} />{t.wayGallery}
            </button>
          </div>
        </div>
        <input
          ref={galleryInputRef}
          className="ob-logo-input"
          type="file"
          accept={COMPANY_LOGO_ACCEPT}
          onChange={handleChange}
        />
        {isMobile && (
          <input
            ref={cameraInputRef}
            className="ob-logo-input"
            type="file"
            accept="image/png,image/jpeg"
            capture="environment"
            onChange={handleChange}
          />
        )}
        {errorMessage && <div className="ob-logo-error" role="alert">{errorMessage}</div>}
        <LogoNote t={t} />
      </div>
    );
  }

  return (
    <div className="ob-form">
      <div className="ob-logo-pre">
        <div className="ob-logo-thumb">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="" />
        </div>
        <div className="ob-logo-meta">
          <div className="ob-logo-name">{file.name}</div>
          <div className="ob-logo-sub">
            <SetupIcon name="check" size={13} weight="bold" />{statusLabel}
          </div>
        </div>
        <div className="ob-logo-actions">
          <button
            type="button"
            className="ob-logo-btn"
            title={t.change}
            aria-label={t.change}
            onClick={() => galleryInputRef.current?.click()}
          >
            <SetupIcon name="pencil" size={16} />
          </button>
          <button
            type="button"
            className="ob-logo-btn del"
            title={t.remove}
            aria-label={t.remove}
            onClick={onRemove}
          >
            <SetupIcon name="trash" size={16} />
          </button>
        </div>
      </div>
      <input
        ref={galleryInputRef}
        className="ob-logo-input"
        type="file"
        accept={COMPANY_LOGO_ACCEPT}
        onChange={handleChange}
      />
      {errorMessage && <div className="ob-logo-error" role="alert">{errorMessage}</div>}
      <LogoNote t={t} />
    </div>
  );
}

interface LogoNoteProps {
  t: Translations;
}

function LogoNote({ t }: LogoNoteProps) {
  return (
    <div className="ob-note">
      <div className="ob-note-ic"><SetupIcon name="info" size={18} /></div>
      <div className="ob-note-tx">{t.logoNote}</div>
    </div>
  );
}
