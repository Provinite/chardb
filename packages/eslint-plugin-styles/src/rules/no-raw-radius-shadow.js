// @ts-check
const {
  CSS_WIDE_KEYWORDS,
  RADIUS_PROPERTY,
  isValueString,
  isZero,
  literalVisitor,
  propertyName,
  styleProperty,
  valueWords,
} = require("../lib/style");

/**
 * Whether this node is a value of a radius or shadow property.
 * @param {import("estree").Node} node
 */
function inRadiusOrShadow(node) {
  const property = styleProperty(node);
  const name = property && propertyName(property);
  return name !== null && (RADIUS_PROPERTY.test(name) || name === "boxShadow");
}

/**
 * Words a radius or shadow may hold without a token. Zero offsets and `inset`
 * let a shadow be composed from tokens.
 * @param {string} word
 */
function isAllowedWord(word) {
  return (
    isZero(word) ||
    word === "none" ||
    word === "inset" ||
    CSS_WIDE_KEYWORDS.has(word)
  );
}

/** @type {import("eslint").Rule.RuleModule} */
module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow literal border radii and box shadows; they come from the theme.",
    },
    schema: [],
    messages: {
      rawRadiusShadow: "Use a radius or shadow token instead of a literal.",
    },
  },
  create(context) {
    return literalVisitor({
      string(node, text) {
        if (!isValueString(node) || !inRadiusOrShadow(node)) return;
        if (!valueWords(text).every(isAllowedWord)) {
          context.report({ node, messageId: "rawRadiusShadow" });
        }
      },
      number(node, value) {
        if (value !== 0 && inRadiusOrShadow(node)) {
          context.report({ node, messageId: "rawRadiusShadow" });
        }
      },
    });
  },
};
