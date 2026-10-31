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

// Rules from packages/eslint-plugin-styles for the conventions in
// apps/frontend/STYLING.md. The literal-value rules are off in the theme
// module, which is where the literals live.
const literalValueRules = [
  "no-raw-color",
  "no-raw-length",
  "no-raw-font",
  "no-raw-radius-shadow",
  "no-raw-z-index",
  "no-raw-motion",
];
const otherStyleRules = [
  "grid-columns-via-track",
  "no-raw-media",
  "hover-in-hover-condition",
  "loop-via-helper",
  "no-important",
];
const setStyleRules = (rules, level) =>
  Object.fromEntries(rules.map((rule) => [`@chardb/styles/${rule}`, level]));

const styledComponentsAllowlist = require("./apps/frontend/styled-components-allowlist.json");

module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: { ecmaVersion: 2022, sourceType: "module" },
  plugins: ["@typescript-eslint", "import"],
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
    // Yarn hoists every workspace's dependencies to the root node_modules, so
    // an import of a package the workspace never declared still resolves and
    // type-checks. Checked against the nearest package.json.
    "import/no-extraneous-dependencies": [
      "error",
      {
        devDependencies: [
          "**/*.{test,spec}.{ts,tsx}",
          "**/__tests__/**",
          "**/setupTests.ts",
          "**/*.config.{js,cjs,mjs,ts,mts}",
          "apps/e2e/**",
          "apps/backend/test/**",
          "scripts/**",
        ],
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
        "apps/frontend/src/**/*.{ts,tsx}",
        "packages/ui/src/**/*.{ts,tsx}",
      ],
      plugins: ["@chardb/styles"],
      rules: {
        // Existing files keep styled-components until they are migrated; a
        // test in the plugin keeps the list in step with the imports.
        "@chardb/styles/no-styled-components": [
          "error",
          { root: __dirname, allow: styledComponentsAllowlist },
        ],
        // Checked from the moment a file is migrated: files still on the
        // styled-components list are skipped, and migrating converts all of
        // a file anyway.
        "@chardb/styles/no-inline-style": [
          "error",
          { root: __dirname, allow: styledComponentsAllowlist },
        ],
      },
    },
    {
      // Scrolling goes through the helpers, which respect reduced motion.
      // Tests stub these methods, which is not scrolling.
      files: [
        "apps/frontend/src/**/*.{ts,tsx}",
        "packages/ui/src/**/*.{ts,tsx}",
      ],
      excludedFiles: [
        "**/*.{test,spec}.{ts,tsx}",
        "**/__tests__/**",
        "**/setupTests.ts",
        "packages/ui/src/motion/scroll.ts",
      ],
      rules: {
        "no-restricted-properties": [
          "error",
          ...["scrollIntoView", "scrollTo"].map((property) => ({
            property,
            message:
              "Use scrollToElement() or scrollToPosition() from @chardb/ui, which respect reduced motion.",
          })),
        ],
      },
    },
    {
      // The helpers in packages/ui/src/css build style objects too, so they
      // are held to the same rules, apart from the one each exists to break.
      files: [
        "apps/frontend/**/*.css.ts",
        "packages/ui/**/*.css.ts",
        "packages/ui/src/css/**/*.ts",
      ],
      excludedFiles: ["**/*.test.ts"],
      plugins: ["@chardb/styles"],
      rules: {
        ...setStyleRules([...literalValueRules, ...otherStyleRules], "error"),
        "no-restricted-imports": [
          "error",
          {
            paths: [
              {
                name: "@chardb/ui",
                message:
                  "Import from @chardb/ui/theme. The style compiler runs this file's imports at build time, and the root entry loads every component.",
              },
            ],
          },
        ],
      },
    },
    {
      files: ["packages/ui/src/theme/**"],
      rules: setStyleRules(literalValueRules, "off"),
    },
    {
      files: ["packages/ui/src/css/loop.ts"],
      rules: { "@chardb/styles/loop-via-helper": "off" },
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
      // CommonJS config files, and the style plugin, which ESLint requires.
      files: ["**/*.cjs", "packages/eslint-plugin-styles/src/**/*.js"],
      parserOptions: { sourceType: "script" },
      rules: { "@typescript-eslint/no-var-requires": "off" },
    },
  ],
};
