import rule from "../src/rules/no-raw-z-index";
import { ruleTester } from "./ruleTester";

const error = { messageId: "rawZIndex" };

ruleTester.run("no-raw-z-index", rule, {
  valid: [
    "style({ zIndex: vars.layer.modal.base });",
    'style({ zIndex: "auto" });',
    'style({ zIndex: "inherit" });',
    "style({ order: 2 });",
    // Behind its siblings inside the parent's stacking context.
    "style({ zIndex: -1 });",
    'style({ zIndex: "-1" });',
  ],
  invalid: [
    { code: "style({ zIndex: 10 });", errors: [error] },
    // layer.page is 0.
    { code: "style({ zIndex: 0 });", errors: [error] },
    { code: "style({ zIndex: 1 });", errors: [error] },
    { code: "style({ zIndex: -2 });", errors: [error] },
    { code: 'style({ zIndex: "9999" });', errors: [error] },
  ],
});
