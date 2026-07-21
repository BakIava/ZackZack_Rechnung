import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import {
  CacheFirst,
  CacheableResponsePlugin,
  ExpirationPlugin,
  Serwist,
  StaleWhileRevalidate,
} from "serwist";
import {
  isPublicOfflineApiPath,
  PUBLIC_OFFLINE_CACHE_HEADER,
  PUBLIC_OFFLINE_CACHE_VALUE,
} from "../lib/pwa/offline-cache";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const LEGACY_PRIVATE_API_CACHES = ["api-fallback", "business-data"];

/** Nur ausdrücklich öffentliche Platzhalter offline verfügbar halten. */
const businessDataCache = [
  {
    matcher: ({ url }: { url: URL }) => isPublicOfflineApiPath(url.pathname),
    handler: new StaleWhileRevalidate({
      cacheName: "public-offline-data-v2",
      plugins: [
        new CacheableResponsePlugin({
          statuses: [200],
          headers: {
            [PUBLIC_OFFLINE_CACHE_HEADER]: PUBLIC_OFFLINE_CACHE_VALUE,
          },
        }),
        new ExpirationPlugin({
          maxEntries: 64,
          maxAgeSeconds: 7 * 24 * 60 * 60,
        }),
      ],
    }),
  },
  {
    matcher: ({ request }: { request: Request }) =>
      request.destination === "image",
    handler: new CacheFirst({
      cacheName: "images",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 48,
          maxAgeSeconds: 30 * 24 * 60 * 60,
        }),
      ],
    }),
  },
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [...businessDataCache, ...defaultCache],
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

// Entfernt mit älteren Service-Worker-Versionen gespeicherte private API-Daten.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all(LEGACY_PRIVATE_API_CACHES.map((cacheName) => caches.delete(cacheName))),
  );
});

serwist.addEventListeners();
