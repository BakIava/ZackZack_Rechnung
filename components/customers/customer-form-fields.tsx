"use client";

import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import type { HTMLInputTypeAttribute } from "react";
import {
  AiIntakeField,
  AiIntakeFields,
  type AiIntakeFieldWidth,
} from "@/components/shared/ai-intake/ai-intake-field";
import type { IntakeFieldValues } from "@/lib/customers/intake-fields";
import { CustomerTypeSelector } from "./customer-type-selector";
import "./customer-form-fields.css";

/** Formularwerte des Kunden-Dialogs: KI-erkennbare Felder + Notiz. */
export interface CustomerFormValues extends IntakeFieldValues {
  note: string;
}

type TextKey = Exclude<keyof IntakeFieldValues, "customerType" | "companyName">;

interface TextField {
  key: TextKey;
  label: string;
  placeholder: string;
  width: AiIntakeFieldWidth;
  autoComplete: string;
  type?: HTMLInputTypeAttribute;
  inputMode?: "numeric";
  optional?: boolean;
}

const TEXT_FIELDS: TextField[] = [
  { key: "firstname", label: "ncFirstname", placeholder: "ncFirstnamePh", width: "half", autoComplete: "given-name" },
  { key: "lastname", label: "ncLastname", placeholder: "ncLastnamePh", width: "half", autoComplete: "family-name" },
  { key: "street", label: "ncStreet", placeholder: "ncStreetPh", width: "wide", autoComplete: "address-line1" },
  { key: "houseNo", label: "ncHouseNo", placeholder: "ncHouseNoPh", width: "narrow", autoComplete: "address-line2" },
  { key: "zip", label: "ncZip", placeholder: "ncZipPh", width: "narrow", autoComplete: "postal-code", inputMode: "numeric" },
  { key: "city", label: "ncCity", placeholder: "ncCityPh", width: "wide", autoComplete: "address-level2" },
  { key: "phone", label: "ncPhone", placeholder: "ncPhonePh", width: "half", autoComplete: "tel", type: "tel", optional: true },
  { key: "email", label: "ncEmail", placeholder: "ncEmailPh", width: "half", autoComplete: "email", type: "email", optional: true },
];

interface CustomerFormFieldsProps {
  values: CustomerFormValues;
  onChange: (patch: Partial<CustomerFormValues>) => void;
}

export function CustomerFormFields({ values, onChange }: CustomerFormFieldsProps) {
  const t = useTranslations("Create");
  const showCompanyName =
    values.customerType === "business" ||
    (values.customerType === null && values.companyName.trim().length > 0);

  return (
    <AiIntakeFields>
      <AiIntakeField label={t("ncType")} as="div">
        <CustomerTypeSelector
          value={values.customerType}
          privateLabel={t("ncPrivate")}
          businessLabel={t("ncBusiness")}
          ariaLabel={t("ncType")}
          onChange={(customerType) => onChange({ customerType })}
        />
        {values.customerType === null && (
          <span className="customer-type-required" role="alert">
            <AlertTriangle size={13} strokeWidth={2.5} aria-hidden />
            {t("ncTypeRequired")}
          </span>
        )}
      </AiIntakeField>

      {showCompanyName && (
        <AiIntakeField label={t("ncBusinessName")}>
          <input
            autoComplete="name"
            value={values.companyName}
            onChange={(event) => onChange({ companyName: event.target.value })}
            placeholder={t("ncBusinessPh")}
          />
        </AiIntakeField>
      )}

      {TEXT_FIELDS.map((field) => (
        <AiIntakeField key={field.key} label={t(field.label)} width={field.width}
          optional={field.optional}>
          <input
            type={field.type}
            inputMode={field.inputMode}
            autoComplete={field.autoComplete}
            value={values[field.key]}
            onChange={(event) => onChange({ [field.key]: event.target.value })}
            placeholder={t(field.placeholder)}
          />
        </AiIntakeField>
      ))}

      <AiIntakeField label={t("ncNote")} optional>
        <textarea
          value={values.note}
          onChange={(event) => onChange({ note: event.target.value })}
          placeholder={t("ncNotePh")}
          rows={2}
        />
      </AiIntakeField>
    </AiIntakeFields>
  );
}
