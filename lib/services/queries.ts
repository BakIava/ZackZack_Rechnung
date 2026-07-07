import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/supabase/auth";
import type { KatalogEintrag } from "@/types/service";
import type { ServiceRow } from "@/types/service";
import { rowToKatalog } from "./mappers";

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
