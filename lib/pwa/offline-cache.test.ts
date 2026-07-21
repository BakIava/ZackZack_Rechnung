import { describe, expect, it } from "vitest";
import {
  isPublicOfflineApiPath,
  publicOfflineCacheHeaders,
  PUBLIC_OFFLINE_CACHE_HEADER,
  PUBLIC_OFFLINE_CACHE_VALUE,
} from "./offline-cache";

describe("Offline-API-Cache", () => {
  it.each(["/api/catalog", "/api/customers", "/api/settings"])(
    "erlaubt den statischen Platzhalter %s",
    (pathname) => {
      expect(isPublicOfflineApiPath(pathname)).toBe(true);
    },
  );

  it.each([
    "/api/documents/abc/pdf",
    "/api/pdf",
    "/api/customers/private",
    "/api/export.json",
  ])("schließt geschützte oder unbekannte Route %s aus", (pathname) => {
    expect(isPublicOfflineApiPath(pathname)).toBe(false);
  });

  it("markiert nur ausdrücklich freigegebene Antworten", () => {
    expect(publicOfflineCacheHeaders()).toEqual({
      [PUBLIC_OFFLINE_CACHE_HEADER]: PUBLIC_OFFLINE_CACHE_VALUE,
    });
  });
});
