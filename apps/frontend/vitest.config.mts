import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";
import { workspaceAliases } from "./workspaceAliases.mjs";

export default defineConfig({
  plugins: [react(), vanillaExtractPlugin()],
  resolve: {
    alias: workspaceAliases,
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/setupTests.ts"],
    // Scoped explicitly so Vitest's defaults can never collect a Playwright
    // spec. Browser E2E lives in apps/e2e and is run with `yarn workspace
    // @chardb/e2e e2e`.
    include: ["src/**/*.{test,spec}.{ts,tsx}", "*.test.mts"],
    css: true,
  },
});
