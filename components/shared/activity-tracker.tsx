"use client";

import { useEffect, useRef } from "react";
import {
  INACTIVITY_COOKIE_MAX_AGE,
  INACTIVITY_TIMEOUT_MS,
  LAST_ACTIVITY_COOKIE,
} from "@/lib/auth/session-lock";

interface ActivityTrackerProps {
  locale: string;
}

const ACTIVITY_EVENTS = ["pointerdown", "click", "keydown", "touchstart"] as const;

/**
 * Aktualisiert die letzte echte Eingabe im Browser und öffnet nach 15 Minuten
 * Untätigkeit den Sperrbildschirm. Die tatsächliche Zugriffssperre liegt in
 * der Middleware; dieser Tracker liefert nur den Aktivitätszeitpunkt.
 */
export function ActivityTracker({ locale }: ActivityTrackerProps) {
  const lastActivityAt = useRef(0);
  const timeoutId = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function lock() {
      const next = `${window.location.pathname}${window.location.search}`;
      const target = new URL(`/${locale}/login`, window.location.origin);
      target.searchParams.set("unlock", "1");
      target.searchParams.set("next", next);
      window.location.assign(`${target.pathname}${target.search}`);
    }

    function scheduleLock() {
      if (timeoutId.current) clearTimeout(timeoutId.current);
      timeoutId.current = setTimeout(lock, INACTIVITY_TIMEOUT_MS);
    }

    function recordActivity() {
      const now = Date.now();
      lastActivityAt.current = now;
      document.cookie = `${LAST_ACTIVITY_COOKIE}=${now}; path=/; max-age=${INACTIVITY_COOKIE_MAX_AGE}; samesite=lax`;
      scheduleLock();
    }

    function handleVisibilityChange() {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastActivityAt.current >= INACTIVITY_TIMEOUT_MS) {
        lock();
        return;
      }
      recordActivity();
    }

    recordActivity();
    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, recordActivity));
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (timeoutId.current) clearTimeout(timeoutId.current);
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, recordActivity));
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [locale]);

  return null;
}
