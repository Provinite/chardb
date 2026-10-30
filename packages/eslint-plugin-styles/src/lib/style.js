// @ts-check

/**
 * @typedef {import("estree").Node & Partial<import("eslint").Rule.NodeParentExtension>} Node
 * @typedef {import("estree").Property & import("eslint").Rule.NodeParentExtension} Property
 * @typedef {(import("estree").Literal | import("estree").TemplateElement) & import("eslint").Rule.NodeParentExtension} StringNode
 */

/** Values every property accepts, which are never design decisions. */
const CSS_WIDE_KEYWORDS = new Set([
  "inherit",
  "initial",
  "unset",
  "revert",
  "revert-layer",
]);

/**
 * Expressions a value passes through on its way to a property: fallback
 * arrays, template literals, conditionals, a sign, and TypeScript casts.
 */
const TRANSPARENT = new Set([
  "ArrayExpression",
  "TemplateLiteral",
  "ConditionalExpression",
  "LogicalExpression",
  "UnaryExpression",
  "TSAsExpression",
  "TSSatisfiesExpression",
]);

/**
 * The text of a string literal or one static part of a template literal.
 * @param {Node} node
 * @returns {string | null}
 */
function stringText(node) {
  if (node.type === "Literal" && typeof node.value === "string") {
    return node.value;
  }
  if (node.type === "TemplateElement") {
    return node.value.cooked ?? node.value.raw;
  }
  return null;
}

/**
 * The node a string stands for: the template literal for one of its parts.
 * @param {Node} node
 * @returns {Node}
 */
function expressionOf(node) {
  return node.type === "TemplateElement" && node.parent ? node.parent : node;
}

/**
 * Whether a string names a module, which no style rule is about.
 * @param {Node} node
 */
function isModuleSource(node) {
  const parent = expressionOf(node).parent;
  if (!parent) return false;
  // TypeScript node types are not in the ESTree union.
  const type = /** @type {string} */ (parent.type);
  return (
    type === "ImportDeclaration" ||
    type === "ExportNamedDeclaration" ||
    type === "ExportAllDeclaration" ||
    type === "ImportExpression" ||
    type === "TSExternalModuleReference" ||
    type === "TSImportType" ||
    type === "TSLiteralType"
  );
}

/**
 * Whether a string is an object key: a selector, condition or name.
 * @param {Node} node
 */
function isKey(node) {
  const expression = expressionOf(node);
  const parent = expression.parent;
  return parent?.type === "Property" && parent.key === expression;
}

/**
 * Whether a string is the selector passed to `globalStyle()`.
 * @param {Node} node
 */
function isGlobalSelector(node) {
  const expression = expressionOf(node);
  const parent = expression.parent;
  return (
    parent?.type === "CallExpression" &&
    referenceName(parent.callee) === "globalStyle" &&
    parent.arguments[0] === expression
  );
}

/**
 * Whether a string is a value, as opposed to a key, selector or module.
 * @param {Node} node
 */
function isValueString(node) {
  return !isKey(node) && !isModuleSource(node) && !isGlobalSelector(node);
}

/**
 * The property whose value holds this node, looking through fallback arrays,
 * template literals and other expressions that pass the value along.
 * @param {Node} node
 * @returns {Property | null}
 */
function styleProperty(node) {
  let child = expressionOf(node);
  let parent = child.parent;
  while (parent && passesValueThrough(parent, child)) {
    child = parent;
    parent = parent.parent;
  }
  if (parent?.type === "Property" && parent.value === child) {
    return /** @type {Property} */ (parent);
  }
  return null;
}

/**
 * Whether `parent` can evaluate to `child`. A condition decides the value
 * without being one: the test of `a ? b : c`, and the left side of `a && b`.
 * @param {Node} parent
 * @param {Node} child
 */
function passesValueThrough(parent, child) {
  if (parent.type === "ConditionalExpression") return child !== parent.test;
  if (parent.type === "LogicalExpression") {
    return parent.operator !== "&&" || child === parent.right;
  }
  return TRANSPARENT.has(parent.type);
}

/**
 * Whether this node is a value of a property whose name passes `test`.
 * @param {Node} node
 * @param {(name: string) => boolean} test
 */
function inProperty(node, test) {
  const property = styleProperty(node);
  const name = property && propertyName(property);
  return name !== null && test(name);
}

/**
 * A property's name when it is written out, or null for a computed key.
 * @param {import("estree").Property} property
 * @returns {string | null}
 */
function propertyName(property) {
  const key = property.key;
  if (!property.computed && key.type === "Identifier") return key.name;
  if (key.type === "Literal" && typeof key.value === "string") return key.value;
  return null;
}

/**
 * The name an identifier or member expression ends in: `hover` for both
 * `hover` and `css.hover`.
 * @param {Node} node
 * @returns {string | null}
 */
function referenceName(node) {
  if (node.type === "Identifier") return node.name;
  if (
    node.type === "MemberExpression" &&
    !node.computed &&
    node.property.type === "Identifier"
  ) {
    return node.property.name;
  }
  return null;
}

/**
 * Words in a CSS value, split on spaces, commas, slashes and brackets.
 * @param {string} text
 */
function valueWords(text) {
  return text.split(/[\s,/()]+/).filter(Boolean);
}

/**
 * Whether a word is zero, with or without a unit.
 * @param {string} word
 */
function isZero(word) {
  return /^[+-]?(?:0+\.?0*|\.0+)[a-z%]*$/i.test(word);
}

/**
 * Visitors for every string literal and static template part, and every
 * number literal, in the file.
 * @param {{
 *   string?: (node: StringNode, text: string) => void,
 *   number?: (node: import("estree").Literal & import("eslint").Rule.NodeParentExtension, value: number) => void,
 * }} handlers
 * @returns {import("eslint").Rule.RuleListener}
 */
function literalVisitor(handlers) {
  return {
    Literal(node) {
      if (typeof node.value === "number") {
        handlers.number?.(node, node.value);
        return;
      }
      const text = stringText(node);
      if (text !== null) handlers.string?.(node, text);
    },
    TemplateElement(node) {
      const text = stringText(node);
      if (text !== null) handlers.string?.(node, text);
    },
  };
}

/**
 * Properties a dedicated rule owns, so a literal there is reported once, by
 * that rule, rather than also by the colour and length rules.
 * @param {string | null} name
 */
function isOwnedProperty(name) {
  return (
    name !== null &&
    (FONT_PROPERTIES.has(name) ||
      RADIUS_PROPERTY.test(name) ||
      name === "boxShadow" ||
      name === "zIndex" ||
      MOTION_PROPERTY.test(name))
  );
}

const FONT_PROPERTIES = new Set([
  "font",
  "fontFamily",
  "fontSize",
  "fontWeight",
]);

const RADIUS_PROPERTY =
  /^border(?:(?:Top|Bottom|Start|End)(?:Left|Right|Start|End))?Radius$/;

const MOTION_PROPERTY =
  /^(?:transition|animation)(?:Duration|Delay|TimingFunction)?$/;

module.exports = {
  CSS_WIDE_KEYWORDS,
  FONT_PROPERTIES,
  MOTION_PROPERTY,
  RADIUS_PROPERTY,
  isModuleSource,
  inProperty,
  isOwnedProperty,
  isValueString,
  isZero,
  literalVisitor,
  propertyName,
  referenceName,
  styleProperty,
  valueWords,
};
