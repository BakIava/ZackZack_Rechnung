"use client";

import "./SetupStepFields.css";
import Image from "next/image";
import { SetupIcon } from "./SetupIcon";
import { type Translations } from "./translations";
import { Field, TextInput, Seg3, Toggle19 } from "./SetupPrimitives";
import type { SetupFormData, SetupFormErrors } from "./types";

interface StepProps {
  t: Translations;
  formData: SetupFormData;
  errors: SetupFormErrors;
  onChange: (key: keyof SetupFormData, value: string | boolean) => void;
}

// ── Step1Fields ───────────────────────────────────────────────────────────────

export function Step1Fields({ t, formData, errors, onChange }: StepProps) {
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
      <Field label={t.director}>
        <TextInput
          value={formData.director}
          onChange={(v) => onChange("director", v)}
          placeholder="z. B. Mehmet Yılmaz"
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

// ── LogoEmpty ─────────────────────────────────────────────────────────────────

interface LogoEmptyProps {
  t: Translations;
}

export function LogoEmpty({ t }: LogoEmptyProps) {
  return (
    <div className="ob-form">
      <button type="button" className="ob-upload">
        <div className="ob-upload-ic"><SetupIcon name="image" size={26} /></div>
        <div className="ob-upload-t">{t.uploadT}</div>
        <div className="ob-upload-s">{t.uploadS}</div>
        <div className="ob-upload-ways">
          <span className="ob-upload-way"><SetupIcon name="camera" size={17} />{t.wayCam}</span>
          <span className="ob-upload-way"><SetupIcon name="image" size={17} />{t.wayGallery}</span>
        </div>
      </button>
      <div className="ob-note">
        <div className="ob-note-ic"><SetupIcon name="info" size={18} /></div>
        <div className="ob-note-tx">{t.logoNote}</div>
      </div>
    </div>
  );
}

// ── LogoPreview ───────────────────────────────────────────────────────────────

interface LogoPreviewProps {
  t: Translations;
}

export function LogoPreview({ t }: LogoPreviewProps) {
  return (
    <div className="ob-form">
      <div className="ob-logo-pre">
        <div className="ob-logo-thumb">
          <Image src="/assets/zackzack-mark.png" alt="Logo" width={72} height={72} />
        </div>
        <div className="ob-logo-meta">
          <div className="ob-logo-name">logo-yilmaz.png</div>
          <div className="ob-logo-sub">
            <SetupIcon name="check" size={13} weight="bold" />{t.uploaded}
          </div>
        </div>
        <div className="ob-logo-actions">
          <button type="button" className="ob-logo-btn" title={t.change}>
            <SetupIcon name="pencil" size={16} />
          </button>
          <button type="button" className="ob-logo-btn del" title={t.remove}>
            <SetupIcon name="trash" size={16} />
          </button>
        </div>
      </div>
      <div className="ob-note">
        <div className="ob-note-ic"><SetupIcon name="info" size={18} /></div>
        <div className="ob-note-tx">{t.logoNote}</div>
      </div>
    </div>
  );
}
