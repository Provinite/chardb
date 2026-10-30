import rule from "../src/rules/no-raw-color";
import { ruleTester } from "./ruleTester";

const error = { messageId: "rawColor" };

ruleTester.run("no-raw-color", rule, {
  valid: [
    "style({ color: vars.text.default, background: vars.surface.raised });",
    'style({ borderColor: "transparent", color: "currentColor" });',
    // Forced-colour system colours are keywords, not design decisions.
    'style({ color: "CanvasText", outlineColor: "Highlight" });',
    'style({ display: "grid", gridTemplateAreas: \'"tan red"\' });',
    "style({ content: '\"red\"' });",
    'style({ fontFamily: vars.font.family.body, animationName: "orange" });',
    // A debug id and other strings outside property values are names.
    'style({ color: vars.text.muted }, "red");',
    'globalStyle("#add", { color: vars.text.default });',
    'style({ selectors: { "#fab &": { color: vars.text.link } } });',
    "style({ border: `${vars.borderWidth.hairline} solid ${vars.border.default}` });",
    // Owned by no-raw-radius-shadow, so one mistake is one error.
    'style({ boxShadow: "0 1px 2px rgb(0 0 0 / 0.1)" });',
  ],
  invalid: [
    { code: 'style({ color: "#fff" });', errors: [error] },
    { code: 'style({ background: "#ffffffcc" });', errors: [error] },
    { code: 'style({ color: "rgb(0 0 0)" });', errors: [error] },
    { code: 'style({ color: "rgba(0, 0, 0, .5)" });', errors: [error] },
    { code: 'style({ color: "hsl(210 40% 98%)" });', errors: [error] },
    { code: 'style({ color: "oklch(70% 0.1 250)" });', errors: [error] },
    {
      code: "style({ color: `color-mix(in srgb, ${vars.text.default} 50%, transparent)` });",
      errors: [error],
    },
    { code: 'style({ color: "red" });', errors: [error] },
    { code: 'style({ outlineColor: "RebeccaPurple" });', errors: [error] },
    {
      code: "style({ border: `${vars.borderWidth.hairline} solid black` });",
      errors: [error],
    },
    { code: 'style({ color: ["red", vars.text.default] });', errors: [error] },
    { code: 'style({ vars: { [accent]: "tomato" } });', errors: [error] },
    // A literal moved into a constant is still a literal.
    {
      code: 'const brand = "#7c3aed"; style({ color: brand });',
      errors: [error],
    },
  ],
});
