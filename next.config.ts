import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import withSerwistInit from "@serwist/next";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const revision =
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ??
  process.env.GIT_COMMIT_SHA?.slice(0, 7) ??
  "dev";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  additionalPrecacheEntries: [
    { url: "/~offline", revision },
    { url: "/manifest.json", revision },
  ],
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Die PDF-Schriften (lib/pdf/fonts) werden zur Renderzeit per fs gelesen und
  // von Next sonst nicht ins Server-Bundle der PDF-Route getract.
  outputFileTracingIncludes: {
    "/api/documents/[document_id]/pdf": ["./lib/pdf/fonts/**"],
  },
};

export default withSerwist(withNextIntl(nextConfig));
