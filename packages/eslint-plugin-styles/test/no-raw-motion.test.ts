import rule from "../src/rules/no-raw-motion";
import { ruleTester } from "./ruleTester";

const error = { messageId: "rawMotion" };

ruleTester.run("no-raw-motion", rule, {
  valid: [
    "style({ transition: `opacity ${vars.motion.duration.fast} ${vars.motion.easing.standard}` });",
    "style({ transitionDuration: vars.motion.duration.normal, transitionTimingFunction: vars.motion.easing.enter });",
    'style({ transitionProperty: "opacity, background-color" });',
    'style({ transition: "none", transitionDelay: "0s" });',
    "style({ animationDelay: vars.timing.loader.delay });",
    "style({ animationName: spin });",
    'style({ backgroundImage: "linear-gradient(to right, transparent, transparent)" });',
  ],
  invalid: [
    {
      code: 'style({ transition: "opacity 200ms ease-in-out" });',
      errors: [error],
    },
    { code: 'style({ transitionDuration: ".3s" });', errors: [error] },
    { code: "style({ transitionDuration: 200 });", errors: [error] },
    {
      code: 'style({ transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)" });',
      errors: [error],
    },
    {
      code: 'style({ animationTimingFunction: "steps(4)" });',
      errors: [error],
    },
    { code: 'style({ animationDelay: "100ms" });', errors: [error] },
    { code: "style({ animation: `${spin} 1s` });", errors: [error] },
    {
      code: "style({ transition: `opacity ${vars.motion.duration.fast} ease` });",
      errors: [error],
    },
  ],
});
