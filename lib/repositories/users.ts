/**
 * Repository `users` — einzige Stelle mit Supabase-Zugriff auf die Tabelle
 * `public.users` (Verknüpfung Auth-User ↔ Firma).
 *
 * Die Admin-Varianten (Service-Role, umgehen RLS) existieren nur für das
 * Onboarding: Dort gibt es die `users`-Zeile noch nicht, RLS-Policies greifen
 * daher nicht. Aufrufer verifizieren die Authentizität vorher selbst.
 */

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Existiert bereits ein Profil (users-Zeile) zum Auth-User? (RLS-Client) */
export async function hasUserProfile(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("users")
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  return Boolean(data);
}

/** Wie hasUserProfile, aber mit Service-Role (Onboarding, vor RLS-Sichtbarkeit). */
export async function hasUserProfileAdmin(userId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("users")
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  return Boolean(data);
}

/**
 * Legt die users-Zeile an (Service-Role, Onboarding).
 * Gibt den Postgres-Fehler durch, damit der Aufrufer z. B. 23505
 * (unique violation → bereits onboarded) gesondert behandeln kann.
 */
export async function insertUserProfileAdmin(profile: {
  id: string;
  company_id: string;
  email: string | null | undefined;
}): Promise<{ error: { message: string; code?: string } | null }> {
  const admin = createAdminClient();
  const { error } = await admin.from("users").insert(profile);
  return { error: error ? { message: error.message, code: error.code } : null };
}
