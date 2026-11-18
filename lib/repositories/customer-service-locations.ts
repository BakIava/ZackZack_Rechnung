/**
 * Repository: Einsatzorte früherer Dokumente eines Kunden (Vorschläge in Schritt 1).
 * Gelesen wird der vorhandene Snapshot `documents.service_location` – kein eigenes Feld.
 */

import { createClient } from "@/lib/supabase/server";
import { parseDocumentServiceLocation } from "@/lib/documents/service-location";
import type { DocumentServiceLocation } from "@/types/service-location";

/** Neueste zuerst; das aktuelle Dokument und stornierte Dokumente zählen nicht. */
export async function listRecentServiceLocationsForCustomer(
  companyId: string,
  customerId: string,
  excludeDocumentId: string,
  limit = 30,
): Promise<DocumentServiceLocation[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .select("service_location")
    .eq("company_id", companyId)
    .eq("customer_id", customerId)
    .neq("id", excludeDocumentId)
    .neq("status", "cancelled")
    .not("service_location", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data.flatMap((row) => {
    const location = parseDocumentServiceLocation(row.service_location);
    return location ? [location] : [];
  });
}
