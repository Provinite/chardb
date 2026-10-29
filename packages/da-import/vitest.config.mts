import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Since Vitest 4 the default excludes are only node_modules and .git, so
    // tsc's compiled copies of the specs in dist/ would be collected too.
    include: ["src/**/*.test.ts"],
  },
});
