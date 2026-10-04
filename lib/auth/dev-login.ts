/** Standard-Test-Konto (u. a. für die e2e-Specs). */
export const DEV_TEST_EMAIL = "zackzack@test.com";

/** Jede Adresse dieser Domain darf im Dev-Modus ohne echten E-Mail-Code einloggen. */
export const DEV_TEST_DOMAIN = "@test.com";

/**
 * Nur `next dev` (NODE_ENV=development) und nur für `@test.com`-Konten:
 * kein OTP-Versand, jeder Code wird akzeptiert. Unbekannte `@test.com`-Adressen
 * werden dabei von Supabase still angelegt und landen im Onboarding (`/setup`) —
 * gewollt, um frische Konten testen zu können. In Production-Builds
 * (`next build`/`next start`, Vercel) ist das immer `false`.
 */
export function isDevTestLogin(
  email: string,
  nodeEnv: string | undefined = process.env.NODE_ENV,
): boolean {
  const normalized = email.trim().toLowerCase();
  return (
    nodeEnv === "development" &&
    normalized.length > DEV_TEST_DOMAIN.length &&
    normalized.endsWith(DEV_TEST_DOMAIN)
  );
}
