import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PLAYWRIGHT_PORT ?? 3122);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./e2e",
  testMatch: ["nachweis-frei.spec.ts", "position-selection.spec.ts"],
  outputDir: "test-results/nachweis-frei",
  reporter: "line",
  workers: 1,
  timeout: 40_000,
  use: {
    ...devices["Desktop Chrome"], baseURL, channel: process.env.PLAYWRIGHT_CHANNEL,
    screenshot: "only-on-failure", trace: "retain-on-failure",
  },
  webServer: {
    command: `npm run dev -- --hostname 127.0.0.1 --port ${port}`,
    url: `${baseURL}/de/nachweis-test`,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:9", NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-only",
      ANTHROPIC_API_KEY: "", SUPABASE_SERVICE_ROLE_KEY: "",
    },
  },
});
