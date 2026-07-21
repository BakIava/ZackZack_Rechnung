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

function getJwtSubject(accessToken: string): string | null {
  try {
    const payloadPart = accessToken.split(".")[1];
    if (!payloadPart) return null;

    const base64 = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const payload = JSON.parse(atob(padded)) as { sub?: unknown };
    return typeof payload.sub === "string" && payload.sub.length > 0
      ? payload.sub
      : null;
  } catch {
    return null;
  }
}

/**
 * `company_id` des aktuellen Users, ebenfalls pro Request memoisiert.
 *
 * Die Middleware hat die Session für diesen Request bereits mit `getUser()`
 * validiert und bei Bedarf aktualisiert. Hier wird deshalb nur der `sub`-Claim
 * aus ihrem Access-Token als Lookup-Filter gelesen. Er ist ausdrücklich kein
 * Autorisierungsbeweis: Der anschließende `users`-Read bleibt RLS-geschützt und
 * liefert für einen manipulierten oder fremden Claim keine Firmen-ID.
 */
export const getCurrentCompanyId = cache(async (): Promise<string | null> => {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session ? getJwtSubject(session.access_token) : null;
  if (!userId) return null;

  const { data } = await supabase
    .from("users")
    .select("company_id")
    .eq("id", userId)
    .maybeSingle();
  return (data?.company_id as string | null) ?? null;
});
