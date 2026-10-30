import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";
import { fileURLToPath } from "node:url";
import { uiAliases } from "./uiAliases.mjs";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), vanillaExtractPlugin()],
  resolve: {
    alias: [
      {
        find: "@",
        replacement: fileURLToPath(new URL("./src", import.meta.url)),
      },
      // Bundle `@chardb/ui` from source, so its `.css.ts` files compile here
      // with the app's. Its dist is only for type declarations.
      ...uiAliases,
      // Bundle `@chardb/shared` from source. Its dist is CommonJS, and its
      // `require("zod")` resolves to zod's CommonJS build while the app's
      // `import` resolves to the ESM one, shipping zod twice.
      {
        find: "@chardb/shared",
        replacement: fileURLToPath(
          new URL("../../packages/shared/src/index.ts", import.meta.url),
        ),
      },
    ],
  },
  server: {
    // FRONTEND_PORT is injected by scripts/with-instance.mjs so several
    // worktrees can each run `yarn dev` at once; 3000 is what instance slot 0
    // (the primary checkout) resolves to.
    port: Number(process.env.FRONTEND_PORT ?? 3000),
    // Fail loudly instead of silently sliding to the next free port, which
    // would land one instance on another instance's number.
    strictPort: true,
    // Communities are served from their own subdomain, and locally that means
    // `willowmere.localhost:<port>` -- browsers resolve every `*.localhost`
    // label to loopback without an /etc/hosts entry, so the request arrives
    // here. Vite would otherwise reject the unfamiliar Host header.
    allowedHosts: [".localhost"],
    // Limit parallel requests and connections
    hmr: {
      overlay: true, // Disable error overlay to reduce requests
    },
    // Add connection limiting
    middlewareMode: false,
  },
  preview: {
    port: Number(process.env.FRONTEND_PORT ?? 3000),
    strictPort: true,
  },
  // Optimize dependency pre-bundling to reduce parallel requests
  optimizeDeps: {
    // Force include common dependencies to reduce discovery requests
    include: [
      "react",
      "react-dom",
      "@apollo/client",
      "styled-components",
      "react-router-dom",
      "react-hook-form",
    ],
  },
});
