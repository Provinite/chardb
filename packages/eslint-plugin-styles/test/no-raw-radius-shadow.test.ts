import rule from "../src/rules/no-raw-radius-shadow";
import { ruleTester } from "./ruleTester";

const error = { messageId: "rawRadiusShadow" };

ruleTester.run("no-raw-radius-shadow", rule, {
  valid: [
    "style({ borderRadius: vars.radius.md, boxShadow: vars.shadow.sm });",
    'style({ borderRadius: 0, borderTopLeftRadius: "0" });',
    'style({ boxShadow: "none" });',
    'style({ borderRadius: "inherit" });',
    // Composed entirely from tokens.
    "style({ boxShadow: `0 0 0 ${vars.borderWidth.focus} ${vars.border.focus}` });",
    "style({ boxShadow: `inset 0 0 0 ${vars.borderWidth.hairline} ${vars.border.default}` });",
  ],
  invalid: [
    { code: 'style({ borderRadius: "4px" });', errors: [error] },
    // Circles use radius.full.
    { code: 'style({ borderRadius: "50%" });', errors: [error] },
    { code: "style({ borderRadius: 8 });", errors: [error] },
    { code: 'style({ borderTopLeftRadius: "2px" });', errors: [error] },
    { code: 'style({ borderEndStartRadius: "2px" });', errors: [error] },
    {
      code: 'style({ boxShadow: "0 1px 2px rgb(0 0 0 / 0.1)" });',
      errors: [error],
    },
    {
      code: "style({ boxShadow: `0 4px 8px ${vars.border.default}` });",
      errors: [error],
    },
  ],
});
