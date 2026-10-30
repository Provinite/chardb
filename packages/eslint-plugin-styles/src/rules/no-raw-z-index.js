// @ts-check
const {
  isValueString,
  literalVisitor,
  propertyName,
  styleProperty,
} = require("../lib/style");

/**
 * Whether this node is a value of `zIndex`.
 * @param {import("estree").Node} node
 */
function inZIndex(node) {
  const property = styleProperty(node);
  return property !== null && propertyName(property) === "zIndex";
}

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
    return literalVisitor({
      string(node, text) {
        if (
          isValueString(node) &&
          /^\s*[+-]?\d+\s*$/.test(text) &&
          inZIndex(node)
        ) {
          context.report({ node, messageId: "rawZIndex" });
        }
      },
      number(node) {
        if (inZIndex(node)) {
          context.report({ node, messageId: "rawZIndex" });
        }
      },
    });
  },
};
