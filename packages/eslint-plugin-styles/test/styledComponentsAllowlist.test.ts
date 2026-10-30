import path from "node:path";
import { fileURLToPath } from "node:url";
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";
import allowlist from "../../../apps/frontend/styled-components-allowlist.json";
import rule from "../src/rules/no-styled-components";

const root = fileURLToPath(new URL("../../..", import.meta.url));

// The rule itself decides what counts as using styled-components, with an
// empty allowlist so every use is reported.
const eslint = new ESLint({
  cwd: root,
  useEslintrc: false,
  plugins: { styles: { rules: { "no-styled-components": rule } } },
  overrideConfig: {
    parser: "@typescript-eslint/parser",
    parserOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      ecmaFeatures: { jsx: true },
    },
    plugins: ["styles"],
    rules: { "styles/no-styled-components": ["error", { root, allow: [] }] },
  },
});

describe("styled-components allowlist", () => {
  it("lists exactly the files that still use styled-components", async () => {
    const results = await eslint.lintFiles([
      "apps/frontend/src/**/*.{ts,tsx}",
      "packages/ui/src/**/*.{ts,tsx}",
    ]);

    const fatal = results.find((result) => result.fatalErrorCount > 0);
    expect(fatal?.messages).toBeUndefined();

    const using = results
      .filter((result) =>
        // Disable comments for rules this run does not load report too.
        result.messages.some(
          (message) => message.ruleId === "styles/no-styled-components",
        ),
      )
      .map((result) =>
        path.relative(root, result.filePath).split(path.sep).join("/"),
      )
      .sort();

    // A migrated file comes off the list in the same change, so the list
    // tracks what is left to migrate.
    expect(allowlist).toEqual(using);
  }, 30_000);
});
