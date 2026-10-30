// @ts-check
const {
  isModuleSource,
  literalVisitor,
  propertyName,
  referenceName,
} = require("../lib/style");

const HOVER = /:hover(?![\w-])/;

/**
 * Whether an object is the hover condition itself, as sprinkles writes it:
 * `{ "@media": hoverQuery, selector: "&:hover" }`.
 * @param {import("estree").ObjectExpression} object
 */
function isHoverCondition(object) {
  return object.properties.some(
    (property) =>
      property.type === "Property" &&
      propertyName(property) === "@media" &&
      referenceName(property.value) === "hoverQuery",
  );
}

/**
 * Whether a `globalStyle()` style puts everything under the hover condition:
 * `{ "@media": { [hoverQuery]: { … } } }`.
 * @param {import("estree").Node | undefined} style
 */
function isHoverOnlyStyle(style) {
  return (
    style?.type === "ObjectExpression" &&
    style.properties.length > 0 &&
    style.properties.every(
      (property) =>
        property.type === "Property" &&
        propertyName(property) === "@media" &&
        property.value.type === "ObjectExpression" &&
        property.value.properties.length > 0 &&
        property.value.properties.every(
          (condition) =>
            condition.type === "Property" &&
            condition.computed &&
            referenceName(condition.key) === "hoverQuery",
        ),
    )
  );
}

/**
 * Whether a node sits inside the hover condition.
 * @param {import("estree").Node & import("eslint").Rule.NodeParentExtension} node
 */
function inHoverCondition(node) {
  /** @type {import("estree").Node | null} */
  let child = node;
  for (
    let ancestor = node.parent;
    ancestor;
    child = ancestor, ancestor = ancestor.parent
  ) {
    if (ancestor.type === "CallExpression") {
      const callee = referenceName(ancestor.callee);
      if (callee === "hover") return true;
      if (callee === "globalStyle" && ancestor.arguments[0] === child) {
        return isHoverOnlyStyle(ancestor.arguments[1]);
      }
    }
    if (
      ancestor.type === "Property" &&
      ancestor.computed &&
      referenceName(ancestor.key) === "hoverQuery"
    ) {
      return true;
    }
    if (ancestor.type === "ObjectExpression" && isHoverCondition(ancestor)) {
      return true;
    }
  }
  return false;
}

/** @type {import("eslint").Rule.RuleModule} */
module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow :hover outside the hover condition; a bare :hover sticks after a tap on touch screens.",
    },
    schema: [],
    messages: {
      bareHover: "Put :hover styles inside the hover condition with hover().",
    },
  },
  create(context) {
    return literalVisitor({
      string(node, text) {
        if (isModuleSource(node) || !HOVER.test(text)) return;
        const expression = node.type === "TemplateElement" ? node.parent : node;
        if (!inHoverCondition(expression)) {
          context.report({ node, messageId: "bareHover" });
        }
      },
    });
  },
};
