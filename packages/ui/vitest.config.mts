import { defineConfig } from "vitest/config";
import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";

// jsdom and the plugin so tests can read the CSS that `.css.ts` files emit.
export default defineConfig({
  plugins: [vanillaExtractPlugin()],
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    css: true,
  },
});
