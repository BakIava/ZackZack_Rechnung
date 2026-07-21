/** 15 Minuten ohne Eingabe sperren die sichtbare App-Sitzung. */
export const INACTIVITY_TIMEOUT_MS = 0.5 * 60 * 1_000;
/** Der Zeitstempel muss länger als der Timeout erhalten bleiben. */
export const INACTIVITY_COOKIE_MAX_AGE = 30 * 24 * 60 * 60;
export const LAST_ACTIVITY_COOKIE = "zz-last-activity";
export const SESSION_LOCK_COOKIE = "zz-session-locked";

/** Erlaubt nur locale-gebundene, interne Ziele nach dem Entsperren. */
export function isLocaleAppPath(path: string | null | undefined, locale: string): path is string {
  if (!path) return false;

  const prefix = `/${locale}`;
  return path === prefix || path.startsWith(`${prefix}/`);
}

/** Wandelt /de/dashboard in das locale-relative Ziel /dashboard um. */
export function toLocaleRelativePath(path: string, locale: string): string {
  return path.slice(`/${locale}`.length) || "/";
}
