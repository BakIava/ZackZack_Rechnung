import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  oxc: { jsx: { runtime: "automatic" } },
  css: { postcss: { plugins: [] } },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts", "lib/**/*.test.tsx", "messages/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
});
