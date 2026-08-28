/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    // Scoped explicitly so Vitest's defaults can never collect a Playwright
    // spec. Browser E2E lives in apps/e2e and is run with `yarn workspace
    // @chardb/e2e e2e`.
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    css: true,
  },
})