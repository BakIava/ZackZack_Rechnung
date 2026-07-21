"use server";

import { cookies } from "next/headers";
import {
  INACTIVITY_COOKIE_MAX_AGE,
  LAST_ACTIVITY_COOKIE,
  SESSION_LOCK_COOKIE,
} from "./session-lock";

/** Hebt die lokale Sichtschutz-Sperre nach einer bewussten Nutzeraktion auf. */
export async function unlockSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_LOCK_COOKIE, "", { path: "/", maxAge: 0 });
  cookieStore.set(LAST_ACTIVITY_COOKIE, String(Date.now()), {
    path: "/",
    maxAge: INACTIVITY_COOKIE_MAX_AGE,
    sameSite: "lax",
  });
}

/** Entfernt Sperr- und Aktivitätsreste beim Konto-Wechsel. */
export async function clearSessionLock(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_LOCK_COOKIE, "", { path: "/", maxAge: 0 });
  cookieStore.set(LAST_ACTIVITY_COOKIE, "", { path: "/", maxAge: 0 });
}
