// @ts-check
const {
  inProperty,
  isOwnedProperty,
  isValueString,
  isZero,
  literalVisitor,
  propertyName,
  styleProperty,
} = require("../lib/style");

/**
 * A number with an absolute or font-relative unit. Viewport and container
 * units (`vh`, `dvh`, `cqi`, …) are relative like percentages, so they pass.
 */
const LENGTH =
  /(?<![\w.#-])[+-]?(?:\d+\.?\d*|\.\d+)(?:px|rem|em|ex|ch|cap|ic|rlh|lh|pt|pc|cm|mm|q|in)(?![\w-])/gi;

/**
 * Properties where vanilla-extract appends `px` to a bare number, so
 * `padding: 4` is a literal length.
 */
const LENGTH_PROPERTY =
  /^(?:(?:min|max)?(?:Width|Height|InlineSize|BlockSize)|width|height|inlineSize|blockSize|margin\w*|padding\w*|gap|rowGap|columnGap|top|right|bottom|left|inset\w*|letterSpacing|wordSpacing|textIndent|border\w*Width|borderSpacing|outlineWidth|outlineOffset|flexBasis|scroll(?:Margin|Padding)\w*|textUnderlineOffset|textDecorationThickness|columnWidth|perspective)$/;

/** @type {import("eslint").Rule.RuleModule} */
module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow literal lengths; spacing, sizes and border widths come from the theme.",
    },
    schema: [],
    messages: {
      rawLength:
        "Use a space, size or border width token instead of a literal length.",
    },
  },
  create(context) {
    return literalVisitor({
      string(node, text) {
        if (!isValueString(node)) return;
        const property = styleProperty(node);
        const name = property && propertyName(property);
        if (name === "content" || isOwnedProperty(name)) return;

        const lengths = text.match(LENGTH) ?? [];
        if (lengths.some((length) => !isZero(length))) {
          context.report({ node, messageId: "rawLength" });
        }
      },
      number(node, value) {
        if (value === 0) return;
        if (inProperty(node, (name) => LENGTH_PROPERTY.test(name))) {
          context.report({ node, messageId: "rawLength" });
        }
      },
    });
  },
};
