import type {
  OnboardingDocumentMediaType,
  OnboardingUploadedFile,
} from "@/types/onboarding-extraction";

export const MAX_ONBOARDING_UPLOAD_BYTES = 10 * 1024 * 1024;
export const ONBOARDING_UPLOAD_BUCKET = "onboarding-uploads";

const MEDIA_TYPE_EXTENSIONS: Record<OnboardingDocumentMediaType, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function isOnboardingDocumentMediaType(
  value: string,
): value is OnboardingDocumentMediaType {
  return Object.hasOwn(MEDIA_TYPE_EXTENSIONS, value);
}

export function resolveOnboardingDocumentMediaType(
  fileName: string,
  declaredType: string,
): OnboardingDocumentMediaType | null {
  if (isOnboardingDocumentMediaType(declaredType)) return declaredType;
  const extension = fileName.split(".").pop()?.toLowerCase();
  if (extension === "pdf") return "application/pdf";
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  return null;
}

export function onboardingDocumentExtension(
  mediaType: OnboardingDocumentMediaType,
): string {
  return MEDIA_TYPE_EXTENSIONS[mediaType];
}

export function validateOnboardingUploadMetadata(
  fileName: string,
  contentType: string,
  size: number,
): "ok" | "unsupported_file" | "file_too_large" {
  if (!isOnboardingDocumentMediaType(contentType) || !fileName.trim()) {
    return "unsupported_file";
  }
  if (!Number.isInteger(size) || size <= 0) return "unsupported_file";
  if (size > MAX_ONBOARDING_UPLOAD_BYTES) return "file_too_large";
  return "ok";
}

export function detectOnboardingDocumentMediaType(
  bytes: Uint8Array,
): OnboardingDocumentMediaType | null {
  if (
    bytes.length >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  ) {
    return "application/pdf";
  }
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

export function uploadBelongsToUser(
  upload: OnboardingUploadedFile,
  userId: string,
): boolean {
  const escapedUserId = userId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pathPattern = new RegExp(
    `^${escapedUserId}/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\\.(pdf|jpg|png|webp)$`,
    "i",
  );
  return (
    pathPattern.test(upload.path) &&
    validateOnboardingUploadMetadata(
      upload.fileName,
      upload.contentType,
      upload.size,
    ) === "ok"
  );
}
