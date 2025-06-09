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
    port: 3000,
    // Limit parallel requests and connections
    hmr: {
      overlay: true, // Disable error overlay to reduce requests
    },
    // Add connection limiting
    middlewareMode: false,
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
