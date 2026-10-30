// @ts-check
const NAMED_COLORS = require("../lib/namedColors");
const {
  isOwnedProperty,
  isValueString,
  literalVisitor,
  propertyName,
  styleProperty,
  valueWords,
} = require("../lib/style");

const HEX = /(?<![\w&-])#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})(?![\w-])/i;

const COLOR_FUNCTION =
  /(?<![\w-])(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix|light-dark)\(/i;

/** Properties whose values are names, where a word such as `tan` is not a colour. */
const NAME_PROPERTIES = new Set([
  "animationName",
  "container",
  "containerName",
  "counterIncrement",
  "counterReset",
  "counterSet",
  "fontFamily",
  "gridArea",
  "gridColumn",
  "gridColumnEnd",
  "gridColumnStart",
  "gridRow",
  "gridRowEnd",
  "gridRowStart",
  "gridTemplate",
  "gridTemplateAreas",
  "listStyleType",
  "quotes",
  "transitionProperty",
  "viewTransitionName",
  "willChange",
]);

/** @type {import("eslint").Rule.RuleModule} */
module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow literal colours; colours come from the theme's semantic tokens.",
    },
    schema: [],
    messages: {
      rawColor: "Use a colour token from vars instead of a literal colour.",
    },
  },
  create(context) {
    return literalVisitor({
      string(node, text) {
        if (!isValueString(node)) return;
        const property = styleProperty(node);
        const name = property && propertyName(property);
        if (name === "content" || isOwnedProperty(name)) return;

        // Named colours only in property values: elsewhere a word such as
        // `red` is a debug id or a name.
        const named =
          property !== null &&
          !(name !== null && NAME_PROPERTIES.has(name)) &&
          valueWords(text).some((word) => NAMED_COLORS.has(word.toLowerCase()));

        if (named || HEX.test(text) || COLOR_FUNCTION.test(text)) {
          context.report({ node, messageId: "rawColor" });
        }
      },
    });
  },
};
