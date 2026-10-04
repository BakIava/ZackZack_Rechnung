"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasUserProfile } from "@/lib/repositories/users";
import { createDevLoginTokenHash } from "@/lib/repositories/dev-auth";
import { getCurrentUser } from "@/lib/supabase/auth";
import { isDevTestLogin } from "./dev-login";
import { resolveAuthLocale } from "./locale";
import { clearSessionLock } from "./session-lock-actions";

export type AuthErrorKey = "rateLimitExceeded" | "codeExpiredOrInvalid" | "generic";
export type AuthResult = { error?: string; errorKey?: AuthErrorKey };

export async function sendLoginCode(email: string, locale: string): Promise<AuthResult> {
  const safeLocale = resolveAuthLocale(locale);
  if (await getCurrentUser()) {
    redirect(`/${safeLocale}/dashboard`);
  }

  // Dev-Test-Konten (@test.com): kein OTP-Versand, der Code wird in verifyLoginCode ignoriert.
  if (isDevTestLogin(email)) return {};

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false },
  });

  if (!error) return {};

  const msg = error.message.toLowerCase();
  if (msg.includes("rate limit") || error.status === 429) {
    return { error: error.message, errorKey: "rateLimitExceeded" };
  }
  return { error: error.message, errorKey: "generic" };
}

export async function verifyLoginCode(
  email: string,
  code: string,
  locale: string,
): Promise<AuthResult> {
  const safeLocale = resolveAuthLocale(locale);
  const supabase = await createClient();
  const { error } = isDevTestLogin(email)
    ? await verifyDevTestLogin(supabase, email)
    : await supabase.auth.verifyOtp({ email, token: code, type: "email" });

  if (error) {
    return { error: error.message, errorKey: "codeExpiredOrInvalid" };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Missing authenticated user", errorKey: "generic" };
  }

  const hasProfile = await hasUserProfile(user.id);

  redirect(hasProfile ? `/${safeLocale}/dashboard` : `/${safeLocale}/setup`);
}

/** Dev-Modus: beliebiger Code → Session per serverseitig erzeugtem Magic-Link-Hash. */
async function verifyDevTestLogin(
  supabase: Awaited<ReturnType<typeof createClient>>,
  email: string,
): Promise<{ error: { message: string } | null }> {
  const tokenHash = await createDevLoginTokenHash(email.trim().toLowerCase());
  if (!tokenHash) return { error: { message: "Dev test login failed" } };
  return supabase.auth.verifyOtp({ token_hash: tokenHash, type: "email" });
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  await clearSessionLock();
}

export type AccessRequestErrorKey = "missingFields" | "badEmail";
export type AccessRequestResult = { error?: string; errorKey?: AccessRequestErrorKey };

const ACCESS_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Registrierung ist noch nicht freigeschaltet (Self-Service-Onboarding folgt).
 * Bis dahin nimmt dieser Platzhalter eine Zugriffsanfrage entgegen und validiert
 * die Eingaben. Es werden bewusst KEINE personenbezogenen Daten geloggt (DSGVO)
 * und noch nichts persistiert – sobald eine `access_requests`-Tabelle existiert,
 * wird der Eintrag hier über ein Repository geschrieben.
 */
export async function requestAccess(input: {
  companyName: string;
  phone: string;
  email: string;
}): Promise<AccessRequestResult> {
  const companyName = input.companyName.trim();
  const phone = input.phone.trim();
  const email = input.email.trim();

  if (!companyName || !phone || !email) {
    return { error: "missing", errorKey: "missingFields" };
  }
  if (!ACCESS_EMAIL_RE.test(email)) {
    return { error: "bad email", errorKey: "badEmail" };
  }

  return {};
}
