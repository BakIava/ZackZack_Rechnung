/**
 * Repository `dev-auth` — Dev-Login ohne E-Mail-Versand.
 *
 * Erzeugt per Service-Role einen Magic-Link-Token-Hash für ein Auth-Konto
 * (unbekannte Adressen legt Supabase dabei an), ohne eine Mail zu verschicken.
 * Der Aufrufer löst ihn mit `verifyOtp({ token_hash })` auf dem normalen
 * Server-Client ein und bekommt so eine echte Session. Nur über `isDevTestLogin()` abgesichert aufrufen.
 */

import { createAdminClient } from "@/lib/supabase/admin";

export async function createDevLoginTokenHash(email: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (error) return null;
  return data.properties.hashed_token;
}
