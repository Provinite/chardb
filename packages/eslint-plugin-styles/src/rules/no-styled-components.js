// @ts-check
const path = require("node:path");

const MODULE = "styled-components";

/**
 * Whether a module source names styled-components.
 * @param {import("estree").Node | null | undefined} source
 */
function isStyledComponents(source) {
  return source?.type === "Literal" && source.value === MODULE;
}

/** @type {WeakMap<string[], Set<string>>} */
const allowedSets = new WeakMap();

/**
 * The allowlist as a set, built once per configuration rather than per file.
 * @param {string[]} allow
 */
function allowedSet(allow) {
  let set = allowedSets.get(allow);
  if (!set) {
    set = new Set(allow);
    allowedSets.set(allow, set);
  }
  return set;
}

/** @type {import("eslint").Rule.RuleModule} */
module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow styled-components in files that do not already use it.",
    },
    // The whole options array, so enabling the rule without options is a
    // configuration error rather than a crash.
    schema: {
      type: "array",
      minItems: 1,
      maxItems: 1,
      items: [
        {
          type: "object",
          properties: {
            root: {
              type: "string",
              description: "Directory the allowlisted paths are relative to.",
            },
            allow: {
              type: "array",
              items: { type: "string" },
              description: "Files that still use styled-components.",
            },
          },
          required: ["root", "allow"],
          additionalProperties: false,
        },
      ],
    },
    messages: {
      styledComponents:
        "Write new styles with vanilla-extract in an adjacent .css.ts file, not styled-components.",
    },
  },
  create(context) {
    /** @type {{ root: string, allow: string[] }} */
    const { root, allow } = context.options[0];
    const relative = path
      .relative(root, context.filename)
      .split(path.sep)
      .join("/");
    if (allowedSet(allow).has(relative)) return {};

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
