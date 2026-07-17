/**
 * Temporäre, private Setup-Dokumente. Der Service-Role-Client ist hier nötig,
 * weil während des Onboardings noch keine public.users-Zeile existiert.
 * Zugriffe werden in der Action separat gegen den Auth-User geprüft.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { ONBOARDING_UPLOAD_BUCKET } from "@/lib/onboarding/extraction-file";

export async function createOnboardingSignedUpload(
  userId: string,
  path: string,
): Promise<{ token: string } | { error: "upload_failed" }> {
  const admin = createAdminClient();
  const { data: staleObjects } = await admin.storage
    .from(ONBOARDING_UPLOAD_BUCKET)
    .list(userId, { limit: 100 });
  if (staleObjects?.length) {
    await admin.storage
      .from(ONBOARDING_UPLOAD_BUCKET)
      .remove(staleObjects.map((object) => `${userId}/${object.name}`));
  }
  const { data, error } = await admin.storage
    .from(ONBOARDING_UPLOAD_BUCKET)
    .createSignedUploadUrl(path);
  if (error || !data?.token) return { error: "upload_failed" };
  return { token: data.token };
}

export async function deleteAllOnboardingUploadsForUser(
  userId: string,
): Promise<void> {
  const admin = createAdminClient();
  const { data } = await admin.storage
    .from(ONBOARDING_UPLOAD_BUCKET)
    .list(userId, { limit: 100 });
  if (!data?.length) return;
  await admin.storage
    .from(ONBOARDING_UPLOAD_BUCKET)
    .remove(data.map((object) => `${userId}/${object.name}`));
}

export async function downloadOnboardingUpload(path: string): Promise<Blob | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(ONBOARDING_UPLOAD_BUCKET)
    .download(path);
  if (error || !data) return null;
  return data;
}

export async function deleteOnboardingUpload(path: string): Promise<boolean> {
  const admin = createAdminClient();
  const { error } = await admin.storage
    .from(ONBOARDING_UPLOAD_BUCKET)
    .remove([path]);
  return !error;
}
