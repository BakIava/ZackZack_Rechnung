"use server";

import { getCurrentUser } from "@/lib/supabase/auth";
import {
  createOnboardingSignedUpload,
  deleteOnboardingUpload,
  downloadOnboardingUpload,
} from "@/lib/repositories/onboarding-uploads";
import { consumeOnboardingAiQuota } from "@/lib/repositories/onboarding-ai-usage";
import {
  OnboardingDocumentExtractionError,
  extractOnboardingDocument,
} from "@/lib/integrations/anthropic/onboarding-document-extractor";
import {
  onboardingDocumentExtension,
  uploadBelongsToUser,
  validateOnboardingUploadMetadata,
} from "./extraction-file";
import { processOnboardingExtraction } from "./extraction-service";
import type {
  OnboardingExtractionResult,
  OnboardingUploadedFile,
  PrepareOnboardingUploadResult,
} from "@/types/onboarding-extraction";

function logExtraction(
  level: "info" | "error",
  traceId: string,
  stage: string,
  details: Record<string, unknown> = {},
): void {
  const payload = { traceId, stage, ...details };
  const line = `[onboarding-extraction] ${JSON.stringify(payload)}`;
  if (level === "error") {
    console.error(line);
    return;
  }
  console.info(line);
}

function safeProviderErrorDetails(error: unknown): Record<string, unknown> {
  if (error instanceof OnboardingDocumentExtractionError) {
    return {
      errorCode: error.code,
      ...error.details,
    };
  }
  return {
    errorCode: "unknown",
    causeName: error instanceof Error ? error.name : "unknown",
  };
}

export async function prepareOnboardingUpload(
  fileName: string,
  contentType: string,
  size: number,
): Promise<PrepareOnboardingUploadResult> {
  const traceId = crypto.randomUUID();
  const validation = validateOnboardingUploadMetadata(fileName, contentType, size);
  if (validation !== "ok") {
    logExtraction("error", traceId, "prepare_rejected", { errorCode: validation });
    return { status: "error", error: validation };
  }

  const user = await getCurrentUser();
  if (!user) {
    logExtraction("error", traceId, "prepare_rejected", {
      errorCode: "not_authenticated",
    });
    return { status: "error", error: "not_authenticated" };
  }

  const typedContentType = contentType as OnboardingUploadedFile["contentType"];
  const extension = onboardingDocumentExtension(typedContentType);
  const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
  const signed = await createOnboardingSignedUpload(user.id, path);
  if ("error" in signed) {
    logExtraction("error", traceId, "signed_upload_failed", {
      errorCode: signed.error,
    });
    return { status: "error", error: signed.error };
  }
  logExtraction("info", traceId, "signed_upload_ready", {
    mediaType: typedContentType,
    sizeBytes: size,
  });

  return {
    status: "ready",
    target: {
      path,
      token: signed.token,
      fileName: fileName.slice(0, 160),
      contentType: typedContentType,
      size,
    },
  };
}

export async function extractUploadedOnboardingDocument(
  upload: OnboardingUploadedFile,
): Promise<OnboardingExtractionResult> {
  const traceId = crypto.randomUUID();
  const user = await getCurrentUser();
  if (!user) {
    logExtraction("error", traceId, "extraction_rejected", {
      errorCode: "not_authenticated",
    });
    return { status: "error", error: "not_authenticated" };
  }

  logExtraction("info", traceId, "extraction_started", {
    mediaType: upload.contentType,
    sizeBytes: upload.size,
  });

  let providerFailureDetails: Record<string, unknown> | null = null;
  const result = await processOnboardingExtraction(user.id, upload, {
    downloadUpload: async (path) => {
      const blob = await downloadOnboardingUpload(path);
      logExtraction(blob ? "info" : "error", traceId, "storage_download", {
        ok: blob !== null,
      });
      return blob;
    },
    deleteUpload: async (path) => {
      const deleted = await deleteOnboardingUpload(path);
      logExtraction(deleted ? "info" : "error", traceId, "storage_cleanup", {
        ok: deleted,
      });
      return deleted;
    },
    consumeQuota: async () => {
      const quota = await consumeOnboardingAiQuota();
      if ("error" in quota) {
        logExtraction("error", traceId, "quota_check", {
          ok: false,
          errorCode: quota.error,
        });
        throw new Error(quota.error);
      }
      logExtraction("info", traceId, "quota_check", {
        ok: true,
        allowed: quota.allowed,
      });
      return quota;
    },
    extractDocument: async (bytes, mediaType) => {
      try {
        const extracted = await extractOnboardingDocument(bytes, mediaType);
        logExtraction("info", traceId, "provider_response", { ok: true });
        return extracted;
      } catch (error) {
        providerFailureDetails = safeProviderErrorDetails(error);
        logExtraction("error", traceId, "provider_response", {
          ok: false,
          ...providerFailureDetails,
        });
        throw error;
      }
    },
  });
  logExtraction(result.status === "success" ? "info" : "error", traceId, "completed", {
    status: result.status,
    errorCode: result.status === "error" ? result.error : undefined,
    foundFieldCount: result.status === "success"
      ? Object.values(result.statuses).filter((status) => status === "found").length
      : undefined,
    ...(providerFailureDetails ?? {}),
  });
  return result;
}

export async function discardUploadedOnboardingDocument(
  upload: OnboardingUploadedFile,
): Promise<void> {
  const traceId = crypto.randomUUID();
  const user = await getCurrentUser();
  if (!user || !uploadBelongsToUser(upload, user.id)) {
    logExtraction("error", traceId, "discard_rejected", {
      errorCode: !user ? "not_authenticated" : "invalid_document",
    });
    return;
  }
  const deleted = await deleteOnboardingUpload(upload.path);
  logExtraction(deleted ? "info" : "error", traceId, "discard_completed", {
    ok: deleted,
  });
}
