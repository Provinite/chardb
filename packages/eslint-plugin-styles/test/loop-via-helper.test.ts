import rule from "../src/rules/loop-via-helper";
import { ruleTester } from "./ruleTester";

const error = { messageId: "loopViaHelper" };

ruleTester.run("loop-via-helper", rule, {
  valid: [
    'style([loop({ kind: "essential", keyframes: spin }), { width: vars.size.target.min }]);',
    'style({ animationIterationCount: 1, animationFillMode: "forwards" });',
    'style({ animationIterationCount: "2" });',
    "style({ animation: `${spin} ${vars.motion.duration.normal}` });",
    "style({ content: '\"infinite\"' });",
  ],
  invalid: [
    {
      code: 'style({ animationIterationCount: "infinite" });',
      errors: [error],
    },
    {
      code: "style({ animation: `${spin} ${vars.motion.duration.essential} infinite` });",
      errors: [error],
    },
  ],
});
