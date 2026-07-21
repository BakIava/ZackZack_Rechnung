export const PUBLIC_OFFLINE_CACHE_HEADER = "X-ZackZack-Offline-Cache";
export const PUBLIC_OFFLINE_CACHE_VALUE = "public";

const PUBLIC_OFFLINE_API_PATHS = new Set([
  "/api/catalog",
  "/api/customers",
  "/api/settings",
]);

/** Nur statische, ausdrücklich freigegebene Platzhalter dürfen offline liegen. */
export function isPublicOfflineApiPath(pathname: string): boolean {
  return PUBLIC_OFFLINE_API_PATHS.has(pathname);
}

export function publicOfflineCacheHeaders(): Record<string, string> {
  return { [PUBLIC_OFFLINE_CACHE_HEADER]: PUBLIC_OFFLINE_CACHE_VALUE };
}
