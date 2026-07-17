export const COMPANY_LOGO_MAX_BYTES = 2 * 1024 * 1024;

export const COMPANY_LOGO_ACCEPT =
  "image/png,image/jpeg,image/svg+xml";

export const COMPANY_LOGO_INPUT_TYPES = [
  "image/png",
  "image/jpeg",
  "image/svg+xml",
] as const;

export type CompanyLogoInputType = (typeof COMPANY_LOGO_INPUT_TYPES)[number];
export type CompanyLogoStoredType = "image/png" | "image/jpeg";

export type CompanyLogoValidationError =
  | "logoFileMissing"
  | "logoTypeInvalid"
  | "logoTooLarge"
  | "logoContentInvalid";

export interface PreparedCompanyLogo {
  bytes: Uint8Array;
  contentType: CompanyLogoStoredType;
  extension: "png" | "jpg";
}

export function validateCompanyLogoSelection(
  file: File | null,
): CompanyLogoValidationError | null {
  if (!file) return "logoFileMissing";
  if (!(COMPANY_LOGO_INPUT_TYPES as readonly string[]).includes(file.type)) {
    return "logoTypeInvalid";
  }
  if (file.size > COMPANY_LOGO_MAX_BYTES) return "logoTooLarge";
  return null;
}
