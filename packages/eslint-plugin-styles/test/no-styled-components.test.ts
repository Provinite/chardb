import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";
import rule from "../src/rules/no-styled-components";
import { ruleTester } from "./ruleTester";

const options = [{ root: "/repo", allow: ["apps/frontend/src/Old.tsx"] }];
const newFile = "/repo/apps/frontend/src/New.tsx";
const error = { messageId: "styledComponents" };

ruleTester.run("no-styled-components", rule, {
  valid: [
    {
      code: 'import styled from "styled-components";',
      filename: "/repo/apps/frontend/src/Old.tsx",
      options,
    },
    {
      code: 'import { style } from "@vanilla-extract/css";',
      filename: newFile,
      options,
    },
  ],
  invalid: [
    {
      code: 'import styled from "styled-components";',
      filename: newFile,
      options,
      errors: [error],
    },
    {
      code: 'import { css, keyframes } from "styled-components";',
      filename: newFile,
      options,
      errors: [error],
    },
    {
      code: 'export { ThemeProvider } from "styled-components";',
      filename: newFile,
      options,
      errors: [error],
    },
    {
      code: 'const sc = await import("styled-components");',
      filename: newFile,
      options,
      errors: [error],
    },
  ],
});

describe("no-styled-components without options", () => {
  // Through the ESLint class, which validates rule options the way a config
  // file is loaded; Linter.verify skips that check.
  it("is a configuration error, not a crash", async () => {
    const eslint = new ESLint({
      useEslintrc: false,
      plugins: { styles: { rules: { "no-styled-components": rule } } },
      overrideConfig: {
        parserOptions: { ecmaVersion: 2022, sourceType: "module" },
        plugins: ["styles"],
        rules: { "styles/no-styled-components": "error" },
      },
    });

    await expect(
      eslint.lintText('import styled from "styled-components";', {
        filePath: "New.ts",
      }),
    ).rejects.toThrow(
      /Configuration for rule "styles\/no-styled-components" is invalid/,
    );
  });
});
