import { createRequire } from "node:module";
import { RuleTester } from "eslint";
import rule from "../src/rules/no-inline-style";

const require = createRequire(import.meta.url);

// TSX, unlike the `*.css.ts` rules.
const tsxTester = new RuleTester({
  parser: require.resolve("@typescript-eslint/parser"),
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
    ecmaFeatures: { jsx: true },
  },
});

// Files still on the styled-components list are not checked yet; migrating
// a file takes it off the list and brings it under this rule.
const options = [{ root: "/repo", allow: ["apps/frontend/src/Old.tsx"] }];
const migrated = "/repo/apps/frontend/src/New.tsx";
const error = { messageId: "inlineStyle" };

tsxTester.run("no-inline-style", rule, {
  valid: [
    {
      code: "<div style={assignInlineVars({ [styles.offset]: `${x}px` })} />;",
      filename: migrated,
      options,
    },
    {
      code: "<div style={open ? assignInlineVars({ [styles.h]: h }) : undefined} />;",
      filename: migrated,
      options,
    },
    {
      code: "<div className={styles.box} />;",
      filename: migrated,
      options,
    },
    {
      code: '<div style={{ color: "red" }} />;',
      filename: "/repo/apps/frontend/src/Old.tsx",
      options,
    },
  ],
  invalid: [
    {
      code: '<div style={{ color: "red" }} />;',
      filename: migrated,
      options,
      errors: [error],
    },
    {
      code: "<Card style={cardStyle} />;",
      filename: migrated,
      options,
      errors: [error],
    },
    {
      code: "<div style={toastStyles(t)} />;",
      filename: migrated,
      options,
      errors: [error],
    },
    {
      code: "<div style={{ ...assignInlineVars({ [a]: b }), flex: 1 }} />;",
      filename: migrated,
      options,
      errors: [error],
    },
    {
      code: '<div style={open ? { height: "1px" } : undefined} />;',
      filename: migrated,
      options,
      errors: [error],
    },
  ],
});
