import type { RawOnboardingExtraction } from "@/lib/integrations/anthropic/onboarding-extraction-contract";
import {
  ONBOARDING_EXTRACTABLE_FIELDS,
  type OnboardingExtractableField,
  type OnboardingExtractedValues,
  type OnboardingExtractionStatuses,
} from "@/types/onboarding-extraction";

type StringField = Exclude<OnboardingExtractableField, "kleinunternehmer">;

const LEGAL_FORMS = new Set(["einzel", "ek", "gbr", "gmbh", "ug"]);

function cleanString(value: string): string {
  return value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatIban(value: string): string | null {
  const compact = value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(compact)) return null;

  const rearranged = `${compact.slice(4)}${compact.slice(0, 4)}`;
  let remainder = 0;
  for (const char of rearranged) {
    const numeric = /\d/.test(char)
      ? char
      : String(char.charCodeAt(0) - 55);
    for (const digit of numeric) {
      remainder = (remainder * 10 + Number(digit)) % 97;
    }
  }
  if (remainder !== 1) return null;
  return compact.match(/.{1,4}/g)?.join(" ") ?? compact;
}

function normalizeStringField(field: StringField, raw: string): string | null {
  const value = cleanString(raw);
  if (!value) return null;

  switch (field) {
    case "legal_form":
      return LEGAL_FORMS.has(value.toLowerCase()) ? value.toLowerCase() : null;
    case "postcode":
      return /^\d{5}$/.test(value) ? value : null;
    case "email":
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 160
        ? value.toLowerCase()
        : null;
    case "iban":
      return formatIban(value);
    case "bic": {
      const compact = value.replace(/\s/g, "").toUpperCase();
      return /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(compact)
        ? compact
        : null;
    }
    case "ust_id": {
      const compact = value.replace(/[\s.-]/g, "").toUpperCase();
      return /^DE\d{9}$/.test(compact) ? compact : null;
    }
    case "steuernummer": {
      const digits = value.replace(/\D/g, "");
      return digits.length >= 8 && digits.length <= 13 && /^[\d\s/-]+$/.test(value)
        ? value
        : null;
    }
    case "phone":
    case "mobile":
    case "fax":
      return value.length <= 50 && /^[+\d\s()/-]+$/.test(value) ? value : null;
    default:
      return value.length <= 200 ? value : null;
  }
}

function inferLegalForm(name: string | undefined): string | null {
  if (!name) return null;
  if (/\bgmbh\b/i.test(name)) return "gmbh";
  if (/\bug(?:\s*\(haftungsbeschränkt\))?(?:\s|$)/i.test(name)) return "ug";
  if (/\bgbr\b/i.test(name)) return "gbr";
  if (/\be\.\s*k\.\b/i.test(name)) return "ek";
  return null;
}

export function emptyOnboardingExtractionStatuses(): OnboardingExtractionStatuses {
  return Object.fromEntries(
    ONBOARDING_EXTRACTABLE_FIELDS.map((field) => [field, "missing"]),
  ) as OnboardingExtractionStatuses;
}

export function normalizeOnboardingExtraction(raw: RawOnboardingExtraction): {
  values: OnboardingExtractedValues;
  statuses: OnboardingExtractionStatuses;
  warnings: string[];
} {
  const statuses = emptyOnboardingExtractionStatuses();
  const stringValues: Partial<Record<StringField, string>> = {};
  const ambiguous = new Set(raw.ambiguous_fields);
  const detected = new Set(raw.detected_fields);

  for (const field of ONBOARDING_EXTRACTABLE_FIELDS) {
    if (ambiguous.has(field)) {
      statuses[field] = "ambiguous";
      continue;
    }
    const value = raw.values[field];
    const hasValue = field === "kleinunternehmer"
      ? value !== "unknown"
      : value.trim().length > 0;
    if (hasValue && !detected.has(field)) {
      statuses[field] = "ambiguous";
      continue;
    }
    if (field === "kleinunternehmer") {
      if (value === "true" || value === "false") statuses[field] = "found";
      continue;
    }
    if (!value.trim()) continue;
    const normalized = normalizeStringField(field, value);
    if (!normalized) {
      statuses[field] = "ambiguous";
      continue;
    }
    stringValues[field] = normalized;
    statuses[field] = "found";
  }

  if (!stringValues.legal_form) {
    const inferred = inferLegalForm(stringValues.name);
    if (inferred) {
      stringValues.legal_form = inferred;
      statuses.legal_form = "found";
    }
  }

  const values: OnboardingExtractedValues = { ...stringValues };
  if (raw.values.kleinunternehmer !== "unknown") {
    values.kleinunternehmer = raw.values.kleinunternehmer === "true";
  }

  return {
    values,
    statuses,
    warnings: raw.warnings.map(cleanString).filter(Boolean).slice(0, 8),
  };
}
