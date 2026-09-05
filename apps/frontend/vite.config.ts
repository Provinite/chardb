import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
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
  build: {
    commonjsOptions: {
      // `@chardb/shared` is the first workspace package the app imports RUNTIME
      // values from rather than types alone -- the community slug rules, which
      // the backend and the migration share. It is built as CommonJS, and
      // rollup's default `include` is /node_modules/ only, so a linked
      // workspace resolves outside it and gets treated as ESM. The build then
      // fails with `"isValidCommunitySlug" is not exported by
      // packages/shared/dist/index.js`, which names a real export.
      include: [/node_modules/, /packages\/shared/],
    },
  },
  // Optimize dependency pre-bundling to reduce parallel requests
  optimizeDeps: {
    // Force include common dependencies to reduce discovery requests
    include: [
      // Same reason as commonjsOptions above, for the dev server.
      "@chardb/shared",
      "react",
      "react-dom",
      "@apollo/client",
      "styled-components",
      "react-router-dom",
      "react-hook-form",
    ],
  },
});
