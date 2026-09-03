/**
 * Single root config for the whole monorepo.
 *
 * Deliberately not per-workspace: `scripts/lint-changed.mjs` lints an arbitrary
 * set of changed paths in one pass, and a root config means files in
 * packages/* are covered too rather than silently skipped for want of a
 * config of their own.
 *
 * `plugin:@typescript-eslint/recommended` is the non-type-checked preset. The
 * type-checked presets need a `project` per workspace and a full tsc program
 * per run; `yarn type-check` already covers what they would catch.
 */
module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: { ecmaVersion: 2022, sourceType: "module" },
  plugins: ["@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    // Last: turns off the stylistic rules that would fight `prettier --check`.
    "prettier",
  ],
  env: { es2022: true, node: true },
  ignorePatterns: [
    "node_modules",
    "dist",
    "build",
    "coverage",
    ".yarn",
    ".tmp",
    "to-delete",
    "*.config.js",
    // Generated: rewritten by codegen/prisma, not hand-edited.
    "apps/frontend/src/generated",
    "apps/e2e/src/generated",
    "packages/database/src/generated",
    // Playwright output.
    "apps/e2e/playwright-report",
    "apps/e2e/test-results",
  ],
  rules: {
    // `_`-prefixed is the conventional "deliberately unused" marker.
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      },
    ],
  },
  overrides: [
    {
      files: ["apps/frontend/**/*.{ts,tsx}", "packages/ui/**/*.{ts,tsx}"],
      extends: ["plugin:react-hooks/recommended"],
      plugins: ["react-refresh"],
      env: { browser: true },
      rules: {
        "react-refresh/only-export-components": [
          "warn",
          { allowConstantExport: true },
        ],
      },
    },
    {
      files: [
        "**/*.{test,spec}.{ts,tsx}",
        "apps/backend/test/**",
        "apps/e2e/**",
      ],
      env: { jest: true },
    },
    {
      // Plain scripts served by the GitHub Pages docs site: browser globals,
      // and loaded by a <script> tag rather than imported, so not a module.
      files: ["docs/**/*.js"],
      parserOptions: { sourceType: "script" },
      env: { browser: true, node: false },
    },
    {
      // CommonJS config files.
      files: ["**/*.cjs"],
      parserOptions: { sourceType: "script" },
      rules: { "@typescript-eslint/no-var-requires": "off" },
    },
  ],
};
