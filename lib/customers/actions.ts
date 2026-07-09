"use server";

import {
  deleteCustomer as deleteCustomerRow,
  getCustomerForEdit as getCustomerForEditRow,
  insertCustomer,
  updateCustomer as updateCustomerRow,
} from "@/lib/repositories/customers";
import type { CustomerInput, CustomerMutationResult, FlowCustomer } from "@/types/customer";

export async function createCustomer(
  input: CustomerInput,
): Promise<CustomerMutationResult> {
  if (!input.name.trim()) return { error: "nameRequired" };
  return insertCustomer(input);
}

export async function updateCustomer(
  id: string,
  input: CustomerInput,
): Promise<CustomerMutationResult> {
  if (!input.name.trim()) return { error: "nameRequired" };
  return updateCustomerRow(id, input);
}

/**
 * Vollständige Kundendaten für den Edit-Modus im Flow laden (eigene Firma).
 * Als Server-Action, damit das Client-Modal sie direkt aufrufen kann.
 */
export async function getCustomerForEdit(id: string): Promise<FlowCustomer | null> {
  return getCustomerForEditRow(id);
}

export async function deleteCustomer(id: string): Promise<CustomerMutationResult> {
  return deleteCustomerRow(id);
}
