"use client";

import { createClient } from "@/lib/supabase/client";
import { ONBOARDING_UPLOAD_BUCKET } from "@/lib/onboarding/extraction-file";
import type { OnboardingUploadTarget } from "@/types/onboarding-extraction";

export async function uploadOnboardingDocument(
  target: OnboardingUploadTarget,
  file: File,
): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase.storage
    .from(ONBOARDING_UPLOAD_BUCKET)
    .uploadToSignedUrl(target.path, target.token, file, {
      contentType: target.contentType,
      upsert: false,
    });
    console.log("uploadOnboardingDocument error", error);
  return !error;
}
