"use server";

import { createClient } from "@/lib/supabase/server";

export type AuthResult = { error?: string };

/**
 * Sends a passwordless 6-digit OTP to the given e-mail address.
 * TODO: Wire Supabase Auth signInWithOtp({ email, options: { shouldCreateUser: true } })
 */
export async function sendLoginCode(email: string): Promise<AuthResult> {
  void email;
  void createClient;
  return { error: "Auth not implemented yet" };
}

/**
 * Verifies the 6-digit code from e-mail and establishes a session.
 * TODO: Wire Supabase Auth verifyOtp({ email, token, type: "email" })
 */
export async function verifyLoginCode(
  email: string,
  code: string,
): Promise<AuthResult> {
  void email;
  void code;
  void createClient;
  return { error: "Auth not implemented yet" };
}

/** Ends the current Supabase session. TODO: supabase.auth.signOut() */
export async function signOut(): Promise<void> {
  void createClient;
}
