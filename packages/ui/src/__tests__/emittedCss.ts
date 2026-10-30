import postcss, { type AtRule, type Node, type Rule } from "postcss";
import selectorParser from "postcss-selector-parser";

/** A style rule from the injected stylesheets, as PostCSS parsed it. */
export interface EmittedRule {
  selector: string;
  /** Enclosing at-rules, outermost first: `["@media (hover: hover)"]`; `[]` at top level. */
  conditions: string[];
  declarations: Record<string, string>;
}

/** Every stylesheet vanilla-extract has injected into the test document. */
const emittedCss = () =>
  [...document.querySelectorAll("style")]
    .map((style) => style.textContent)
    .join("\n");

const isAtRule = (node: Node | undefined): node is AtRule =>
  node?.type === "atrule";

const conditionsOf = (rule: Rule) => {
  const conditions: string[] = [];
  for (let node = rule.parent; isAtRule(node); node = node.parent) {
    conditions.unshift(`@${node.name} ${node.params}`);
  }
  return conditions;
};

/** Every style rule in the document, in stylesheet order. */
export const emittedRules = (): EmittedRule[] => {
  const rules: EmittedRule[] = [];
  postcss.parse(emittedCss()).walkRules((rule) => {
    const declarations: Record<string, string> = {};
    rule.walkDecls((decl) => {
      declarations[decl.prop] = decl.value;
    });
    rules.push({
      selector: rule.selector,
      conditions: conditionsOf(rule),
      declarations,
    });
  });
  return rules;
};

const hasClass = (selector: string, className: string) => {
  let found = false;
  selectorParser((root) => {
    root.walkClasses((node) => {
      if (node.value === className) found = true;
    });
  }).processSync(selector);
  return found;
};

/** The rules whose selector includes `className`, in stylesheet order. */
export const rulesFor = (className: string) =>
  emittedRules().filter((rule) => hasClass(rule.selector, className));

/**
 * The declarations that apply to an element's classes under exactly
 * `conditions`, merged in stylesheet order. Rules with a pseudo-class or a
 * descendant in their selector are left out.
 */
export const declarationsOf = (element: Element, conditions: string[] = []) => {
  const classes = [...element.classList];
  const merged: Record<string, string> = {};
  for (const rule of emittedRules()) {
    const own = classes.some((name) => sameSelector(rule.selector, `.${name}`));
    const sameConditions =
      rule.conditions.length === conditions.length &&
      rule.conditions.every((condition, i) => condition === conditions[i]);
    if (own && sameConditions) Object.assign(merged, rule.declarations);
  }
  return merged;
};

/** Whether two selectors are the same once parsed, whatever their whitespace. */
export const sameSelector = (a: string, b: string) => {
  const normalize = (selector: string) =>
    selectorParser().processSync(selector, { lossless: false });
  return normalize(a) === normalize(b);
};
