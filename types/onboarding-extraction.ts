import type { SetupFormData } from "./company";

export const ONBOARDING_EXTRACTABLE_FIELDS = [
  "name",
  "legal_form",
  "director",
  "street",
  "street_no",
  "postcode",
  "city",
  "handelsregister_nr",
  "registergericht",
  "email",
  "phone",
  "mobile",
  "fax",
  "steuernummer",
  "ust_id",
  "kleinunternehmer",
  "iban",
  "bic",
  "bank_name",
  "account_holder",
] as const;

export type OnboardingExtractableField =
  (typeof ONBOARDING_EXTRACTABLE_FIELDS)[number];

export type OnboardingExtractedValues = Partial<
  Pick<SetupFormData, OnboardingExtractableField>
>;

export type OnboardingExtractionFieldStatus =
  | "found"
  | "ambiguous"
  | "missing";

export type OnboardingExtractionStatuses = Record<
  OnboardingExtractableField,
  OnboardingExtractionFieldStatus
>;

export type OnboardingDocumentMediaType =
  | "application/pdf"
  | "image/jpeg"
  | "image/png"
  | "image/webp";

export interface OnboardingUploadTarget {
  path: string;
  token: string;
  fileName: string;
  contentType: OnboardingDocumentMediaType;
  size: number;
}

export interface OnboardingUploadedFile {
  path: string;
  fileName: string;
  contentType: OnboardingDocumentMediaType;
  size: number;
}

export type OnboardingExtractionErrorCode =
  | "not_authenticated"
  | "unsupported_file"
  | "file_too_large"
  | "upload_failed"
  | "invalid_document"
  | "no_issuer_found"
  | "quota_reached"
  | "quota_unavailable"
  | "provider_unavailable"
  | "cleanup_failed";

export type PrepareOnboardingUploadResult =
  | { status: "ready"; target: OnboardingUploadTarget }
  | { status: "error"; error: OnboardingExtractionErrorCode };

export type OnboardingExtractionResult =
  | {
      status: "success";
      values: OnboardingExtractedValues;
      statuses: OnboardingExtractionStatuses;
      warnings: string[];
    }
  | { status: "error"; error: OnboardingExtractionErrorCode };
