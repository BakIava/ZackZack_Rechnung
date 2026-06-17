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
};

export default withSerwist(withNextIntl(nextConfig));
