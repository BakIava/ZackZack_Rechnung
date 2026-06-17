import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import {
  CacheFirst,
  ExpirationPlugin,
  NetworkFirst,
  Serwist,
  StaleWhileRevalidate,
} from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

/** Stammdaten, Katalog und Kunden offline verfügbar halten */
const businessDataCache = [
  {
    matcher: ({ url }: { url: URL }) =>
      url.pathname.startsWith("/api/customers") ||
      url.pathname.startsWith("/api/catalog") ||
      url.pathname.startsWith("/api/settings"),
    handler: new StaleWhileRevalidate({
      cacheName: "business-data",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 64,
          maxAgeSeconds: 7 * 24 * 60 * 60,
        }),
      ],
    }),
  },
  {
    matcher: ({ url }: { url: URL }) => url.pathname.startsWith("/api/"),
    handler: new NetworkFirst({
      cacheName: "api-fallback",
      networkTimeoutSeconds: 5,
      plugins: [
        new ExpirationPlugin({
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60,
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

serwist.addEventListeners();
