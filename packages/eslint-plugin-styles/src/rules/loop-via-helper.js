// @ts-check
const { inProperty, isValueString, literalVisitor } = require("../lib/style");

const LOOP_PROPERTIES = new Set(["animation", "animationIterationCount"]);

/** @type {import("eslint").Rule.RuleModule} */
module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow infinite animations outside loop(), which stops or slows them under reduced motion.",
    },
    schema: [],
    messages: {
      loopViaHelper:
        "Write looping animations with loop(), which handles reduced motion.",
    },
  },
  create(context) {
    return literalVisitor({
      string(node, text) {
        if (
          !isValueString(node) ||
          !/(?<![\w-])infinite(?![\w-])/i.test(text)
        ) {
          return;
        }
        if (inProperty(node, (name) => LOOP_PROPERTIES.has(name))) {
          context.report({ node, messageId: "loopViaHelper" });
        }
      },
    });
  },
};
