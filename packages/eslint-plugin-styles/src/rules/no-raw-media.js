// @ts-check
const { propertyName } = require("../lib/style");

const CONDITION_KEYS = new Set(["@media", "@container"]);

/**
 * Whether a condition is written out rather than built by a helper: a string
 * or template literal, as a key or as the value itself.
 * @param {import("estree").Node} node
 */
function isWrittenOut(node) {
  return (
    (node.type === "Literal" && typeof node.value === "string") ||
    node.type === "TemplateLiteral"
  );
}

/** @type {import("eslint").Rule.RuleModule} */
module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow hand-written @media and @container conditions; mq(), cq() and the theme's queries build them.",
    },
    schema: [],
    messages: {
      rawMedia:
        "Build media conditions with mq() and container conditions with cq().",
    },
  },
  create(context) {
    return {
      Property(node) {
        const name = propertyName(node);
        if (name === null || !CONDITION_KEYS.has(name)) return;

        // Sprinkles conditions take the query as the value.
        if (isWrittenOut(node.value)) {
          context.report({ node: node.value, messageId: "rawMedia" });
          return;
        }
        if (node.value.type !== "ObjectExpression") return;

        for (const condition of node.value.properties) {
          if (condition.type !== "Property") continue;
          if (!condition.computed || isWrittenOut(condition.key)) {
            context.report({ node: condition.key, messageId: "rawMedia" });
          }
        }
      },
    };
  },
};
