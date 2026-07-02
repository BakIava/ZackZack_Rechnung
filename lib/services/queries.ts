import { createClient } from "@/lib/supabase/server";
import type { KatalogEintrag } from "@/lib/katalog/types";
import { rowToKatalog, type ServiceRow } from "./types";

export async function getServices(): Promise<KatalogEintrag[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profile } = await supabase
    .from("users")
    .select("company_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) return [];

  const { data, error } = await supabase
    .from("services")
    .select("id, company_id, description_de, description_tr, description_ar, unit, default_price")
    .eq("company_id", profile.company_id)
    .order("description_de");

  if (error || !data) return [];
  return (data as ServiceRow[]).map(rowToKatalog);
}
