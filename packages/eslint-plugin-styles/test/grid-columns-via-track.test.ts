import rule from "../src/rules/grid-columns-via-track";
import { ruleTester } from "./ruleTester";

const error = { messageId: "literalColumns" };

ruleTester.run("grid-columns-via-track", rule, {
  valid: [
    "style({ gridTemplateColumns: track.fr(1) });",
    'style({ gridTemplateColumns: [track.fr(2), track.fixed(vars.size.column.sm)].join(" ") });',
    "style({ gridTemplateColumns: `${track.fr(1)} ${track.content}` });",
    // `split` is a class to compose, but a value built from shares is fine.
    'style({ gridTemplateColumns: shares.map((share) => track.fr(share)).join(" ") });',
    // The Grid primitive's auto-fit track.
    "style({ gridTemplateColumns: `repeat(${mode}, ${track.fr(1, `min(${min}, 100%)`)})` });",
    "style({ gridTemplateColumns: vars.columns });",
    'style({ gridTemplateColumns: "none" });',
    'style({ gridTemplateColumns: "inherit" });',
    // Other grid properties are not this rule's.
    'style({ gridTemplateRows: "auto 1fr" });',
    'style({ gridTemplateAreas: "\\"title\\" \\"body\\"" });',
  ],
  invalid: [
    { code: 'style({ gridTemplateColumns: "1fr 2fr" });', errors: [error] },
    { code: 'style({ gridTemplateColumns: "repeat(3, 1fr)" });', errors: [error] },
    { code: "style({ gridTemplateColumns: `1fr 1fr` });", errors: [error] },
    // Under a condition, as anywhere else.
    {
      code: 'style({ "@media": { [mq("md")]: { gridTemplateColumns: "1fr 1fr" } } });',
      errors: [error],
    },
    {
      code: 'style({ gridTemplateColumns: wide ? "1fr 2fr" : "1fr" });',
      errors: [error],
    },
    {
      code: 'style({ "gridTemplateColumns": "1fr 1fr" });',
      errors: [error],
    },
  ],
});
