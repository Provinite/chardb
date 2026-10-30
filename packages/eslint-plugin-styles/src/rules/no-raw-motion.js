// @ts-check
const {
  MOTION_PROPERTY,
  inProperty,
  isValueString,
  isZero,
  literalVisitor,
} = require("../lib/style");

const TIME = /(?<![\w.#-])[+-]?(?:\d+\.?\d*|\.\d+)m?s(?![\w-])/gi;

const EASING =
  /(?<![\w-])(?:ease|ease-in|ease-out|ease-in-out|linear|step-start|step-end)(?![\w-])|(?<![\w-])(?:cubic-bezier|steps|linear)\(/i;

/**
 * Whether this node is a value of a transition or animation property.
 * @param {import("estree").Node} node
 */
const inMotionProperty = (node) =>
  inProperty(node, (name) => MOTION_PROPERTY.test(name));

/** @type {import("eslint").Rule.RuleModule} */
module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow literal durations and easings in transitions and animations; they come from the motion tokens.",
    },
    schema: [],
    messages: {
      rawMotion:
        "Use a motion token from vars.motion instead of a literal duration or easing.",
    },
  },
  create(context) {
    return literalVisitor({
      string(node, text) {
        if (!isValueString(node) || !inMotionProperty(node)) return;
        const times = text.match(TIME) ?? [];
        if (times.some((time) => !isZero(time)) || EASING.test(text)) {
          context.report({ node, messageId: "rawMotion" });
        }
      },
      number(node, value) {
        if (value !== 0 && inMotionProperty(node)) {
          context.report({ node, messageId: "rawMotion" });
        }
      },
    });
  },
};
