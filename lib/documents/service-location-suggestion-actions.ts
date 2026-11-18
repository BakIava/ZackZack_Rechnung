"use server";

import { getCurrentCompanyId } from "@/lib/supabase/auth";
import { listRecentServiceLocationsForCustomer } from "@/lib/repositories/customer-service-locations";
import type { DocumentServiceLocation } from "@/types/service-location";
import { uniqueServiceLocations } from "./service-location-suggestions";

/** Die letzten Einsatzorte des gewählten Kunden als Vorschlag – Fehler ergeben einfach keine. */
export async function getServiceLocationSuggestions(
  documentId: string,
  customerId: string,
): Promise<DocumentServiceLocation[]> {
  if (typeof documentId !== "string" || typeof customerId !== "string" || !customerId) return [];
  const companyId = await getCurrentCompanyId();
  if (!companyId) return [];
  const locations = await listRecentServiceLocationsForCustomer(companyId, customerId, documentId);
  return uniqueServiceLocations(locations);
}
