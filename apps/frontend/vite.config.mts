import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";
import { fileURLToPath } from "node:url";
import { workspaceAliases } from "./workspaceAliases.mjs";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), vanillaExtractPlugin()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          // The libraries the shell loads on every page, in chunks of their
          // own: an app-only deploy leaves their content, and so their hashed
          // filenames, unchanged, so returning visitors keep them cached.
          // `$initial` limits each group to what the entry imports
          // statically, so a library only pages use stays with them. Split by
          // family so no chunk passes 500 kB and an upgrade to one family
          // leaves the others cached.
          groups: [
            {
              name: "react",
              test: /[\\/]node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom|@remix-run[\\/]router)[\\/]/,
              tags: ["$initial"],
              priority: 2,
            },
            {
              name: "apollo",
              test: /[\\/]node_modules[\\/](@apollo|graphql|graphql-ws|graphql-tag|@wry|optimism|zen-observable|zen-observable-ts|ts-invariant|rehackt)[\\/]/,
              tags: ["$initial"],
              priority: 1,
            },
            {
              name: "vendor",
              test: /[\\/]node_modules[\\/]/,
              tags: ["$initial"],
            },
          ],
        },
      },
    },
  },
  resolve: {
    alias: [
      {
        find: "@",
        replacement: fileURLToPath(new URL("./src", import.meta.url)),
      },
      ...workspaceAliases,
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
