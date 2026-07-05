import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Validierter Auth-User des aktuellen Requests.
 *
 * `supabase.auth.getUser()` ist kein lokaler Cookie-Read, sondern ein
 * Netzwerk-Roundtrip zum Supabase-Auth-Server (Token-Validierung). Bisher rief
 * jede Query-/Action-Datei ihn eigenständig auf – ein Seitenaufruf löste so
 * mehrere identische Auth-Roundtrips aus. `cache()` memoisiert das Ergebnis über
 * den gesamten Render-Baum EINES Requests hinweg: Layout, Seite und alle Queries
 * teilen sich denselben Aufruf.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/**
 * `company_id` des aktuellen Users, ebenfalls pro Request memoisiert. Ersetzt die
 * bislang in jeder Query-Datei duplizierte `getUser()` + `users`-Lookup-Kette,
 * sodass pro Request nur noch ein Auth-Roundtrip und ein `company_id`-Lookup
 * anfallen – unabhängig davon, wie viele Queries die Firma brauchen.
 */
export const getCurrentCompanyId = cache(async (): Promise<string | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("users")
    .select("company_id")
    .eq("id", user.id)
    .maybeSingle();
  return (data?.company_id as string | null) ?? null;
});
