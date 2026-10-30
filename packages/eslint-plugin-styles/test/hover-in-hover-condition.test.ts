import rule from "../src/rules/hover-in-hover-condition";
import { ruleTester } from "./ruleTester";

const error = { messageId: "bareHover" };

ruleTester.run("hover-in-hover-condition", rule, {
  valid: [
    'style({ "@media": hover({ "&:hover": { color: vars.text.link } }) });',
    'style({ "@media": { ...hover({ "&:hover:not(:disabled)": {} }), [mq("md")]: {} } });',
    'style({ "@media": { [hoverQuery]: { selectors: { "&:hover": {} } } } });',
    // The sprinkles hover condition.
    'defineProperties({ conditions: { hover: { "@media": hoverQuery, selector: "&:hover:not(:disabled)" } } });',
    'globalStyle("a:hover", { "@media": { [hoverQuery]: { color: vars.text.linkHover } } });',
    'style({ selectors: { "&:focus-visible": { outlineColor: vars.border.focus } } });',
    'style({ selectors: { "&:hovered": {} } });',
  ],
  invalid: [
    {
      code: 'style({ selectors: { "&:hover": { color: vars.text.link } } });',
      errors: [error],
    },
    {
      code: 'style({ ":hover": { color: vars.text.link } });',
      errors: [error],
    },
    {
      code: 'globalStyle("a:hover", { color: vars.text.linkHover });',
      errors: [error],
    },
    {
      code: 'globalStyle("a:hover", { "@media": { [hoverQuery]: {}, [mq("md")]: {} } });',
      errors: [error],
    },
    {
      code: 'style({ "@media": { [mq("md")]: { selectors: { "&:hover": {} } } } });',
      errors: [error],
    },
    {
      code: "style({ selectors: { [`${parent}:hover &`]: {} } });",
      errors: [error],
    },
  ],
});
