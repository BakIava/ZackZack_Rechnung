import type { RawOnboardingExtraction } from "@/lib/integrations/anthropic/onboarding-extraction-contract";
import {
  MAX_ONBOARDING_UPLOAD_BYTES,
  detectOnboardingDocumentMediaType,
  uploadBelongsToUser,
} from "./extraction-file";
import { normalizeOnboardingExtraction } from "./extraction-validation";
import type {
  OnboardingDocumentMediaType,
  OnboardingExtractionResult,
  OnboardingUploadedFile,
} from "@/types/onboarding-extraction";

interface OnboardingExtractionDependencies {
  downloadUpload: (path: string) => Promise<Blob | null>;
  deleteUpload: (path: string) => Promise<boolean>;
  consumeQuota: () => Promise<{ allowed: boolean }>;
  extractDocument: (
    bytes: Uint8Array,
    mediaType: OnboardingDocumentMediaType,
  ) => Promise<RawOnboardingExtraction>;
}

async function runExtraction(
  upload: OnboardingUploadedFile,
  dependencies: OnboardingExtractionDependencies,
): Promise<OnboardingExtractionResult> {
  const blob = await dependencies.downloadUpload(upload.path);
  if (
    !blob ||
    blob.size <= 0 ||
    blob.size > MAX_ONBOARDING_UPLOAD_BYTES ||
    blob.size !== upload.size
  ) {
    return { status: "error", error: "invalid_document" };
  }

  const bytes = new Uint8Array(await blob.arrayBuffer());
  const mediaType = detectOnboardingDocumentMediaType(bytes);
  if (!mediaType || mediaType !== upload.contentType) {
    return { status: "error", error: "invalid_document" };
  }

  let quota: { allowed: boolean };
  try {
    quota = await dependencies.consumeQuota();
  } catch {
    return { status: "error", error: "quota_unavailable" };
  }
  if (!quota.allowed) return { status: "error", error: "quota_reached" };

  let raw: RawOnboardingExtraction;
  try {
    raw = await dependencies.extractDocument(bytes, mediaType);
  } catch {
    return { status: "error", error: "provider_unavailable" };
  }

  const normalized = normalizeOnboardingExtraction(raw);
  if (!normalized.values.name) {
    return { status: "error", error: "no_issuer_found" };
  }
  return { status: "success", ...normalized };
}

/** Providerunabhängige Ablaufsteuerung inklusive garantiertem Löschversuch. */
export async function processOnboardingExtraction(
  userId: string,
  upload: OnboardingUploadedFile,
  dependencies: OnboardingExtractionDependencies,
): Promise<OnboardingExtractionResult> {
  if (!uploadBelongsToUser(upload, userId)) {
    return { status: "error", error: "invalid_document" };
  }

  let result: OnboardingExtractionResult;
  try {
    result = await runExtraction(upload, dependencies);
  } catch {
    result = { status: "error", error: "invalid_document" };
  }
  let deleted = false;
  try {
    deleted = await dependencies.deleteUpload(upload.path);
  } catch {
    deleted = false;
  }
  if (!deleted) return { status: "error", error: "cleanup_failed" };
  return result;
}
