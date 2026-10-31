// @ts-check

/** Values that set no columns, so there are no proportions to get wrong. */
const KEYWORDS = new Set([
  "none",
  "inherit",
  "initial",
  "unset",
  "revert",
  "revert-layer",
]);

/**
 * The strings a value can take, if every one of them is written out in the
 * source; null if any part is computed, such as a `track.*` call or a token.
 * @param {import("estree").Node} node
 * @returns {string[] | null}
 */
function writtenOut(node) {
  // TypeScript node types are not in the ESTree union.
  const type = /** @type {string} */ (node.type);
  if (node.type === "Literal") {
    return typeof node.value === "string" ? [node.value] : null;
  }
  if (node.type === "TemplateLiteral") {
    return node.expressions.length === 0
      ? [node.quasis.map((q) => q.value.cooked ?? q.value.raw).join("")]
      : null;
  }
  if (node.type === "ConditionalExpression") {
    const a = writtenOut(node.consequent);
    const b = writtenOut(node.alternate);
    return a && b ? [...a, ...b] : null;
  }
  if (type === "TSAsExpression" || type === "TSSatisfiesExpression") {
    return writtenOut(
      /** @type {{ expression: import("estree").Node }} */ (
        /** @type {unknown} */ (node)
      ).expression,
    );
  }
  return null;
}

/**
 * The property's name, whether written as an identifier or a string.
 * @param {import("estree").Property} node
 */
function propertyName(node) {
  if (node.computed) return null;
  if (node.key.type === "Identifier") return node.key.name;
  if (node.key.type === "Literal" && typeof node.key.value === "string") {
    return node.key.value;
  }
  return null;
}

/** @type {import("eslint").Rule.RuleModule} */
module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow hand-written grid-template-columns; build columns with track.* or split.",
    },
    schema: [],
    messages: {
      literalColumns:
        "Build grid columns with split[...] or the track.* helpers from @chardb/ui/theme, not a hand-written value.",
    },
  },
  create(context) {
    return {
      Property(node) {
        if (propertyName(node) !== "gridTemplateColumns") return;
        const values = writtenOut(
          /** @type {import("estree").Node} */ (node.value),
        );
        if (values && values.some((value) => !KEYWORDS.has(value.trim()))) {
          context.report({ node: node.value, messageId: "literalColumns" });
        }
      },
    };
  },
};
