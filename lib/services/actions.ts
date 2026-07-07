"use server";

import {
  deleteService as deleteServiceRow,
  insertService,
  updateService as updateServiceRow,
  type ServiceMutationResult,
} from "@/lib/repositories/services";
import type { ServiceInput } from "@/types/service";

export async function createService(input: ServiceInput): Promise<ServiceMutationResult> {
  if (!input.description_de.trim()) return { error: "deRequired" };
  return insertService(input);
}

export async function updateService(id: string, input: ServiceInput): Promise<ServiceMutationResult> {
  if (!input.description_de.trim()) return { error: "deRequired" };
  return updateServiceRow(id, input);
}

export async function deleteService(id: string): Promise<ServiceMutationResult> {
  return deleteServiceRow(id);
}
