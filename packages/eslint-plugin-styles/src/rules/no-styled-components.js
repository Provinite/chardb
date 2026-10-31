// @ts-check
const { allowlistSchema, isListed } = require("../lib/allowlist");

const MODULE = "styled-components";

/**
 * Whether a module source names styled-components.
 * @param {import("estree").Node | null | undefined} source
 */
function isStyledComponents(source) {
  return source?.type === "Literal" && source.value === MODULE;
}

/** @type {import("eslint").Rule.RuleModule} */
module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow styled-components in files that do not already use it.",
    },
    schema: allowlistSchema("Files that still use styled-components."),
    messages: {
      styledComponents:
        "Write new styles with vanilla-extract in an adjacent .css.ts file, not styled-components.",
    },
  },
  create(context) {
    if (isListed(context)) return {};

    /** @param {import("estree").Node} node */
    const report = (node) =>
      context.report({ node, messageId: "styledComponents" });

    return {
      ImportDeclaration(node) {
        if (isStyledComponents(node.source)) report(node);
      },
      ExportNamedDeclaration(node) {
        if (isStyledComponents(node.source)) report(node);
      },
      ExportAllDeclaration(node) {
        if (isStyledComponents(node.source)) report(node);
      },
      ImportExpression(node) {
        if (isStyledComponents(node.source)) report(node);
      },
    };
  },
};
