// @ts-check
const { inProperty, isValueString, literalVisitor } = require("../lib/style");

/**
 * Whether this node is a value of `zIndex`.
 * @param {import("estree").Node} node
 */
const inZIndex = (node) => inProperty(node, (name) => name === "zIndex");

/** @type {import("eslint").Rule.RuleModule} */
module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow numeric z-index values; they come from the layer scale.",
    },
    schema: [],
    messages: {
      rawZIndex:
        "Use a layer token from vars.layer instead of a literal z-index.",
    },
  },
  create(context) {
    // -1 puts an element behind its siblings inside the parent's stacking
    // context, which the layer scale has no step for.
    return literalVisitor({
      string(node, text) {
        if (
          isValueString(node) &&
          /^\s*[+-]?\d+\s*$/.test(text) &&
          text.trim() !== "-1" &&
          inZIndex(node)
        ) {
          context.report({ node, messageId: "rawZIndex" });
        }
      },
      number(node, value) {
        const negative =
          node.parent.type === "UnaryExpression" &&
          node.parent.operator === "-";
        if (!(negative && value === 1) && inZIndex(node)) {
          context.report({ node, messageId: "rawZIndex" });
        }
      },
    });
  },
};
