// @ts-check
const {
  CSS_WIDE_KEYWORDS,
  FONT_PROPERTIES,
  isValueString,
  literalVisitor,
  propertyName,
  styleProperty,
  valueWords,
} = require("../lib/style");

/**
 * The font property this node is a value of, if any.
 * @param {import("estree").Node} node
 */
function inFontProperty(node) {
  const property = styleProperty(node);
  const name = property && propertyName(property);
  return name !== null && FONT_PROPERTIES.has(name);
}

/** @type {import("eslint").Rule.RuleModule} */
module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow literal font families, sizes and weights; they come from the theme.",
    },
    schema: [],
    messages: {
      rawFont: "Use a font token from vars.font instead of a literal.",
    },
  },
  create(context) {
    return literalVisitor({
      string(node, text) {
        if (!isValueString(node) || !inFontProperty(node)) return;
        if (valueWords(text).some((word) => !CSS_WIDE_KEYWORDS.has(word))) {
          context.report({ node, messageId: "rawFont" });
        }
      },
      number(node) {
        if (inFontProperty(node)) {
          context.report({ node, messageId: "rawFont" });
        }
      },
    });
  },
};
