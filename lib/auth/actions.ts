"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasUserProfile } from "@/lib/repositories/users";

export type AuthErrorKey = "rateLimitExceeded" | "codeExpiredOrInvalid" | "generic";
export type AuthResult = { error?: string; errorKey?: AuthErrorKey };

const TEST_EMAIL = "zackzack@test.com";
const TEST_CODE = "232323";
const TEST_PASSWORD = "zz-internal-test-pw-!9x";

export async function sendLoginCode(email: string): Promise<AuthResult> {
  if (email.toLowerCase().trim() === TEST_EMAIL) return {};

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
  if (email.toLowerCase().trim() === TEST_EMAIL) {
    if (code !== TEST_CODE) {
      return { error: "Ungültiger Code", errorKey: "codeExpiredOrInvalid" };
    }

    // Ensure test user exists in Supabase auth
    const admin = createAdminClient();
    await admin.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
    });

    // Create a real session so auth.getUser() works everywhere downstream
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });
    if (error) return { error: error.message, errorKey: "generic" };

    const hasProfile = await hasUserProfile(
      (await supabase.auth.getUser()).data.user!.id,
    );

    redirect(hasProfile ? `/${locale}/dashboard` : `/${locale}/setup`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    email,
    token: code,
    type: "email",
  });

  if (error) {
    return { error: error.message, errorKey: "codeExpiredOrInvalid" };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const hasProfile = await hasUserProfile(user!.id);

  redirect(hasProfile ? `/${locale}/dashboard` : `/${locale}/setup`);
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
