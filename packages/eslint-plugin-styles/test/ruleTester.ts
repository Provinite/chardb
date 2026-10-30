import { createRequire } from "node:module";
import { RuleTester } from "eslint";

const require = createRequire(import.meta.url);

/**
 * Parses cases as TypeScript modules, the way `*.css.ts` files are linted.
 * RuleTester registers its cases with the global `describe` and `it`, which
 * vitest.config.mts turns on.
 */
export const ruleTester = new RuleTester({
  parser: require.resolve("@typescript-eslint/parser"),
  parserOptions: { ecmaVersion: 2022, sourceType: "module" },
});
