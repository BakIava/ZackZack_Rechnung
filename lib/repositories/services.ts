/**
 * Repository `services` — einzige Stelle mit Supabase-Zugriff auf die Tabelle
 * `services` (Leistungskatalog, Server).
 */

import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/supabase/auth";
import { rowToKatalog } from "@/lib/services/mappers";
import type { KatalogEintrag, ServiceInput, ServiceRow } from "@/types/service";

export interface ServiceMutationResult {
  id?: string;
  error?: string;
}

/** Kompletter Katalog der eigenen Firma, alphabetisch nach deutschem Begriff. */
export async function getServices(): Promise<KatalogEintrag[]> {
  const companyId = await getCurrentCompanyId();
  if (!companyId) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("services")
    .select("id, company_id, description_de, description_tr, description_ar, unit, default_price")
    .eq("company_id", companyId)
    .order("description_de");

  if (error || !data) return [];
  return (data as ServiceRow[]).map(rowToKatalog);
}

/** Snapshot-Felder eines Katalogeintrags für die Positionsübernahme (Schritt 2). */
export async function getServiceSnapshot(
  serviceId: string,
): Promise<Pick<ServiceRow, "description_de" | "unit" | "default_price"> | null> {
  const companyId = await getCurrentCompanyId();
  if (!companyId) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("services")
    .select("description_de, unit, default_price")
    .eq("id", serviceId)
    .eq("company_id", companyId)
    .maybeSingle();
  if (!data) return null;

  return {
    description_de: data.description_de as string,
    unit: (data.unit as string | null) ?? null,
    default_price: (data.default_price as number | null) ?? null,
  };
}

/** Anzahl der Katalog-Leistungen der eigenen Firma (RLS-scoped). */
export async function countServices(): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("services")
    .select("id", { count: "exact", head: true });
  return count ?? 0;
}

export async function insertService(input: ServiceInput): Promise<ServiceMutationResult> {
  const companyId = await getCurrentCompanyId();
  if (!companyId) return { error: "notAuthenticated" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("services")
    .insert({
      company_id: companyId,
      description_de: input.description_de.trim(),
      description_tr: input.description_tr?.trim() || null,
      description_ar: input.description_ar?.trim() || null,
      unit: input.unit?.trim() || null,
      default_price: input.default_price ?? null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  return { id: data.id };
}

export async function updateService(
  id: string,
  input: ServiceInput,
): Promise<ServiceMutationResult> {
  const companyId = await getCurrentCompanyId();
  if (!companyId) return { error: "notAuthenticated" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("services")
    .update({
      description_de: input.description_de.trim(),
      description_tr: input.description_tr?.trim() || null,
      description_ar: input.description_ar?.trim() || null,
      unit: input.unit?.trim() || null,
      default_price: input.default_price ?? null,
    })
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) return { error: error.message };
  return {};
}

export async function deleteService(id: string): Promise<ServiceMutationResult> {
  const companyId = await getCurrentCompanyId();
  if (!companyId) return { error: "notAuthenticated" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("services")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) return { error: error.message };
  return {};
}
