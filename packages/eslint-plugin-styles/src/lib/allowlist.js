// @ts-check
const path = require("node:path");

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

/**
 * Options schema for a rule configured with a list of files, relative to a
 * root. The whole options array, so enabling the rule without options is a
 * configuration error rather than a crash.
 * @param {string} allowDescription
 */
function allowlistSchema(allowDescription) {
  return {
    type: "array",
    minItems: 1,
    maxItems: 1,
    items: [
      {
        type: "object",
        properties: {
          root: {
            type: "string",
            description: "Directory the listed paths are relative to.",
          },
          allow: {
            type: "array",
            items: { type: "string" },
            description: allowDescription,
          },
        },
        required: ["root", "allow"],
        additionalProperties: false,
      },
    ],
  };
}

/**
 * Whether the file being linted is on the rule's list.
 * @param {import("eslint").Rule.RuleContext} context
 */
function isListed(context) {
  /** @type {{ root: string, allow: string[] }} */
  const { root, allow } = context.options[0];
  const relative = path
    .relative(root, context.filename)
    .split(path.sep)
    .join("/");
  return allowedSet(allow).has(relative);
}

module.exports = { allowlistSchema, isListed };
