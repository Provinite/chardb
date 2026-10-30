import rule from "../src/rules/no-important";
import { ruleTester } from "./ruleTester";

const error = { messageId: "important" };

ruleTester.run("no-important", rule, {
  valid: [
    "style({ color: vars.text.default });",
    'style({ selectors: { "&:not(.important)": { color: vars.text.muted } } });',
  ],
  invalid: [
    {
      code: "style({ color: `${vars.text.default} !important` });",
      errors: [error],
    },
    { code: 'style({ display: "none!important" });', errors: [error] },
    {
      code: "style({ padding: `${vars.space.md} ! important` });",
      errors: [error],
    },
  ],
});
