"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthErrorKey = "rateLimitExceeded" | "codeExpiredOrInvalid" | "generic";
export type AuthResult = { error?: string; errorKey?: AuthErrorKey };

const TEST_EMAIL = "zackzack@test.com";
const TEST_CODE = "232323";

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
    redirect(`/${locale}/setup`);
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

  const { data: profile } = await supabase
    .from("users")
    .select("id")
    .eq("id", user!.id)
    .maybeSingle();

  redirect(profile ? `/${locale}/dashboard` : `/${locale}/setup`);
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
