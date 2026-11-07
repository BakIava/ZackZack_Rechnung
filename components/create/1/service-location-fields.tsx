"use client";

import { useTranslations } from "next-intl";
import {
  AiIntakeField,
  AiIntakeFields,
  type AiIntakeFieldWidth,
} from "@/components/shared/ai-intake/ai-intake-field";
import type { ServiceLocationInput } from "@/types/service-location";

type LocationFieldKey = Exclude<keyof ServiceLocationInput, "sourceText">;

const FIELDS: { key: LocationFieldKey; width: AiIntakeFieldWidth; maxLength: number }[] = [
  { key: "name", width: "full", maxLength: 160 },
  { key: "street", width: "wide", maxLength: 160 },
  { key: "houseNumber", width: "narrow", maxLength: 20 },
  { key: "postcode", width: "narrow", maxLength: 20 },
  { key: "city", width: "wide", maxLength: 120 },
  { key: "addressExtra", width: "full", maxLength: 240 },
];

interface ServiceLocationFieldsProps {
  value: ServiceLocationInput;
  onChange: (value: ServiceLocationInput) => void;
}

export function ServiceLocationFields({ value, onChange }: ServiceLocationFieldsProps) {
  const t = useTranslations("ServiceLocation");
  return (
    <AiIntakeFields>
      {FIELDS.map(({ key, width, maxLength }) => (
        <AiIntakeField key={key} label={t(key)} width={width}>
          <input
            value={value[key]}
            autoComplete="off"
            maxLength={maxLength}
            dir="auto"
            placeholder={t(`${key}Placeholder`)}
            onChange={(event) => onChange({ ...value, [key]: event.target.value })}
          />
        </AiIntakeField>
      ))}
    </AiIntakeFields>
  );
}
