// @ts-check
const {
  CSS_WIDE_KEYWORDS,
  FONT_PROPERTIES,
  inProperty,
  isValueString,
  literalVisitor,
  valueWords,
} = require("../lib/style");

/** @param {string} name */
const isFontProperty = (name) => FONT_PROPERTIES.has(name);

/**
 * Words a font value may hold without a token. A percentage is relative to
 * the parent's font, as in `fontSize: "100%"` on a form control.
 * @param {string} word
 */
function isAllowedWord(word) {
  return CSS_WIDE_KEYWORDS.has(word) || /^(?:\d+\.?\d*|\.\d+)%$/.test(word);
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
        if (!isValueString(node) || !inProperty(node, isFontProperty)) return;
        if (!valueWords(text).every(isAllowedWord)) {
          context.report({ node, messageId: "rawFont" });
        }
      },
      number(node) {
        if (inProperty(node, isFontProperty)) {
          context.report({ node, messageId: "rawFont" });
        }
      },
    });
  },
};
