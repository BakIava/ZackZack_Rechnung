"use server";

import { revalidatePath } from "next/cache";
import {
  deleteService as deleteServiceRow,
  insertService,
  updateService as updateServiceRow,
  type ServiceMutationResult,
} from "@/lib/repositories/services";
import type { ServiceInput } from "@/types/service";

const APP_LAYOUT_PATTERN = "/[locale]/(app)";

export async function createService(input: ServiceInput): Promise<ServiceMutationResult> {
  if (!input.description_de.trim()) return { error: "deRequired" };
  const result = await insertService(input);
  if (!result.error) revalidatePath(APP_LAYOUT_PATTERN, "layout");
  return result;
}

export async function updateService(id: string, input: ServiceInput): Promise<ServiceMutationResult> {
  if (!input.description_de.trim()) return { error: "deRequired" };
  return updateServiceRow(id, input);
}

export async function deleteService(id: string): Promise<ServiceMutationResult> {
  const result = await deleteServiceRow(id);
  if (!result.error) revalidatePath(APP_LAYOUT_PATTERN, "layout");
  return result;
}
