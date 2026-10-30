import rule from "../src/rules/no-raw-length";
import { ruleTester } from "./ruleTester";

const error = { messageId: "rawLength" };

ruleTester.run("no-raw-length", rule, {
  valid: [
    "style({ padding: vars.space.md, width: vars.size.column.md });",
    'style({ padding: 0, margin: "0", marginTop: "0px" });',
    'style({ margin: "0 auto" });',
    'style({ width: "100%", flexBasis: "50%" });',
    'style({ minHeight: "100dvh", width: "50vw", inlineSize: "100cqi" });',
    'style({ gridTemplateColumns: "1fr 2fr" });',
    'style({ width: "min-content", height: "auto" });',
    "style({ lineHeight: 1.5, flexGrow: 1, opacity: 0.5, order: 2 });",
    'style({ transform: "rotate(1turn)", aspectRatio: "16 / 9" });',
    "style({ content: '\"2px\"' });",
    'style({ selectors: { "&:nth-child(2n)": { padding: vars.space.sm } } });',
    'const ratios = { "1:1": [1, 1], "2:1": [2, 1] };',
    "style({ width: `calc(100% - ${vars.space.md})` });",
    'style({ color: "#1e293b" });',
    // Owned by no-raw-font and no-raw-radius-shadow.
    'style({ fontSize: "14px", borderRadius: "4px", boxShadow: "0 1px 2px" });',
  ],
  invalid: [
    { code: 'style({ padding: "16px" });', errors: [error] },
    { code: 'style({ width: "20rem" });', errors: [error] },
    { code: 'style({ letterSpacing: "0.12em" });', errors: [error] },
    {
      code: "style({ margin: `0 ${vars.space.md} 1em` });",
      errors: [error],
    },
    { code: 'style({ transform: "translateY(-2px)" });', errors: [error] },
    { code: 'style({ width: "calc(100% - .5rem)" });', errors: [error] },
    { code: 'style({ maxWidth: "60ch" });', errors: [error] },
    // vanilla-extract appends px to a bare number in a length property.
    { code: "style({ padding: 4 });", errors: [error] },
    { code: "style({ marginTop: -4 });", errors: [error] },
    { code: "style({ gap: 8, maxWidth: 600 });", errors: [error, error] },
    {
      code: 'const gutter = "1.5rem"; style({ padding: gutter });',
      errors: [error],
    },
  ],
});
