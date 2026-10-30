import rule from "../src/rules/no-raw-media";
import { ruleTester } from "./ruleTester";

const error = { messageId: "rawMedia" };

ruleTester.run("no-raw-media", rule, {
  valid: [
    'style({ "@media": { [mq("md")]: { flexDirection: "row" } } });',
    'style({ "@media": { [reducedMotionQuery]: { animationName: "none" } } });',
    'style({ "@media": hover({ "&:hover": { color: vars.text.link } }) });',
    'style({ "@media": { ...hover({ "&:hover": {} }), [mq("lg")]: {} } });',
    'style({ "@container": cq(panel, { 30: { display: "flex" } }) });',
    'style({ "@container": { ...cq(card, { 20: {} }), ...cq(page, { 48: {} }) } });',
    // Sprinkles conditions.
    'defineProperties({ conditions: { md: { "@media": mq("md") }, hover: { "@media": hoverQuery } } });',
  ],
  invalid: [
    {
      code: 'style({ "@media": { "screen and (min-width: 768px)": {} } });',
      errors: [error],
    },
    {
      code: 'style({ "@media": { ["(min-width: 40em)"]: {} } });',
      errors: [error],
    },
    {
      code: 'style({ "@media": { [`screen and (min-width: ${n}em)`]: {} } });',
      errors: [error],
    },
    {
      code: 'style({ "@media": { [`${mq("md")} and (orientation: landscape)`]: {} } });',
      errors: [error],
    },
    {
      code: 'style({ "@media": { [mq("md")]: {}, "(hover: hover)": {} } });',
      errors: [error],
    },
    {
      code: 'style({ "@container": { "panel (min-width: 30rem)": {} } });',
      errors: [error],
    },
    {
      code: 'defineProperties({ conditions: { md: { "@media": "screen and (min-width: 48em)" } } });',
      errors: [error],
    },
  ],
});
