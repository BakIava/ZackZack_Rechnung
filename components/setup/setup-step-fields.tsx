"use client";

import { SetupIcon } from "./setup-icon";
import { type Translations } from "./translations";
import { Field, TextInput, Toggle19 } from "./setup-primitives";
import type { SetupFormData, SetupFormErrors } from "@/types/company";

interface StepProps {
  t: Translations;
  formData: SetupFormData;
  errors: SetupFormErrors;
  onChange: <K extends keyof SetupFormData>(key: K, value: SetupFormData[K]) => void;
}

// ── Step2Fields ───────────────────────────────────────────────────────────────

export function Step2Fields({ t, formData, errors, onChange }: StepProps) {
  const optBadge = <span className="ob-opt">{t.opt}</span>;
  return (
    <div className="ob-form">
      <Field
        fieldName="email"
        label={t.email}
        badge={optBadge}
        hint={t.emailHint}
        error={errors.email}
      >
        <TextInput
          name="email"
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
        fieldName="steuernummer"
        label={t.steuernr}
        hint={<><span>{t.steuernrHint}</span><span className="mono">123/456/78901</span></>}
        error={errors.steuernummer}
      >
        <TextInput
          name="steuernummer"
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
      <Field fieldName="iban" label={t.iban} req error={errors.iban}>
        <TextInput
          name="iban"
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
