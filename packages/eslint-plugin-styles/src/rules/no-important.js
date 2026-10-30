// @ts-check
const { isModuleSource, literalVisitor } = require("../lib/style");

/** @type {import("eslint").Rule.RuleModule} */
module.exports = {
  meta: {
    type: "problem",
    docs: { description: "Disallow !important." },
    schema: [],
    messages: {
      important: "Do not use !important.",
    },
  },
  create(context) {
    return literalVisitor({
      string(node, text) {
        if (!isModuleSource(node) && /!\s*important/i.test(text)) {
          context.report({ node, messageId: "important" });
        }
      },
    });
  },
};
