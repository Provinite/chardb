import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";
import { uiAliases } from "./uiAliases.mjs";

export default defineConfig({
  plugins: [react(), vanillaExtractPlugin()],
  resolve: {
    // As in vite.config.mts: `@chardb/ui` from source, so its `.css.ts` files
    // compile in tests too.
    alias: uiAliases,
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/setupTests.ts"],
    // Scoped explicitly so Vitest's defaults can never collect a Playwright
    // spec. Browser E2E lives in apps/e2e and is run with `yarn workspace
    // @chardb/e2e e2e`.
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    css: true,
  },
});
