import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { RuleTester } from "eslint";

const require = createRequire(import.meta.url);

const fixtures = fileURLToPath(new URL("./fixtures", import.meta.url));

/** Every case is linted as this file, so the rule has types to ask about. */
export const filename = `${fixtures}/file.ts`;

/** What the fixtures treat as the database's models. */
export const options = [{ declaredIn: ["/fixtures/models"] }];

/**
 * Parses cases with type information from `test/fixtures`. RuleTester
 * registers its cases with the global `describe` and `it`, which
 * vitest.config.mts turns on.
 */
export const ruleTester = new RuleTester({
  parser: require.resolve("@typescript-eslint/parser"),
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
    project: "./tsconfig.json",
    tsconfigRootDir: fixtures,
  },
});
