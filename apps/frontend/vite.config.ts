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
