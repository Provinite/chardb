import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    // RuleTester registers its cases with the global describe and it.
    globals: true,
  },
});
