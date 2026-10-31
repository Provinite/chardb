// @ts-check
const { allowlistSchema, isListed } = require("../lib/allowlist");

/**
 * @typedef {{ type: string, [key: string]: unknown }} AnyNode
 */

/**
 * Whether a `style` value only passes runtime values as CSS variables:
 * `assignInlineVars(...)`, or a choice between that and nothing.
 * @param {AnyNode} node
 * @returns {boolean}
 */
function onlyInlineVars(node) {
  if (node.type === "CallExpression") {
    const callee = /** @type {AnyNode} */ (node.callee);
    const name =
      callee.type === "Identifier"
        ? callee.name
        : callee.type === "MemberExpression"
          ? /** @type {AnyNode} */ (callee.property).name
          : null;
    return name === "assignInlineVars";
  }
  if (node.type === "ConditionalExpression") {
    return (
      onlyInlineVars(/** @type {AnyNode} */ (node.consequent)) &&
      onlyInlineVars(/** @type {AnyNode} */ (node.alternate))
    );
  }
  if (node.type === "LogicalExpression") {
    return onlyInlineVars(/** @type {AnyNode} */ (node.right));
  }
  if (node.type === "Identifier") return node.name === "undefined";
  return node.type === "Literal" && node.value === null;
}

/** @type {import("eslint").Rule.RuleModule} */
module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow inline styles in migrated files, apart from CSS variables set with assignInlineVars.",
    },
    schema: allowlistSchema(
      "Files not checked yet: those still on the styled-components list.",
    ),
    messages: {
      inlineStyle:
        "Put styles in an adjacent .css.ts file; pass runtime values as CSS variables with assignInlineVars.",
    },
  },
  create(context) {
    if (isListed(context)) return {};
    return {
      /** @param {AnyNode} node */
      JSXAttribute(node) {
        const name = /** @type {AnyNode} */ (node.name);
        if (name.type !== "JSXIdentifier" || name.name !== "style") return;
        const value = /** @type {AnyNode | null} */ (node.value);
        const expression =
          value?.type === "JSXExpressionContainer"
            ? /** @type {AnyNode} */ (value.expression)
            : null;
        if (expression && onlyInlineVars(expression)) return;
        context.report({
          node: /** @type {import("estree").Node} */ (
            /** @type {unknown} */ (node)
          ),
          messageId: "inlineStyle",
        });
      },
    };
  },
};
