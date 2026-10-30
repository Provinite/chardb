import rule from "../src/rules/no-raw-font";
import { ruleTester } from "./ruleTester";

const error = { messageId: "rawFont" };

ruleTester.run("no-raw-font", rule, {
  valid: [
    "style({ fontFamily: vars.font.family.body, fontSize: vars.font.size.md, fontWeight: vars.font.weight.bold });",
    'style({ fontFamily: "inherit", fontSize: "inherit", fontWeight: "inherit" });',
    'style({ font: "inherit" });',
    "style({ font: `${vars.font.size.md}/${vars.font.lineHeight.normal} ${vars.font.family.body}` });",
    'style({ fontVariantNumeric: "tabular-nums", fontStyle: "italic" });',
    // Percentages are relative to the parent, not design decisions.
    'style({ fontSize: "100%" });',
    "style({ font: `100%/${vars.font.lineHeight.normal} ${vars.font.family.body}` });",
  ],
  invalid: [
    { code: 'style({ fontFamily: "Inter, sans-serif" });', errors: [error] },
    { code: 'style({ fontSize: "14px" });', errors: [error] },
    { code: 'style({ fontSize: "larger" });', errors: [error] },
    { code: 'style({ fontSize: "1em" });', errors: [error] },
    { code: "style({ fontSize: 14 });", errors: [error] },
    { code: "style({ fontWeight: 700 });", errors: [error] },
    { code: 'style({ fontWeight: "bold" });', errors: [error] },
    { code: 'style({ font: "12px/1.5 monospace" });', errors: [error] },
    {
      code: "style({ font: `bold ${vars.font.size.md} ${vars.font.family.body}` });",
      errors: [error],
    },
  ],
});
