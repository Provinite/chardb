import postcss, { type AtRule, type Node, type Rule } from "postcss";
import selectorParser from "postcss-selector-parser";

// The same reader as packages/ui/src/__tests__/emittedCss.ts. The frontend
// cannot import test code from @chardb/ui, so keep the two in step.

/** A style rule from the injected stylesheets, as PostCSS parsed it. */
export interface EmittedRule {
  selector: string;
  /** Enclosing at-rules, outermost first: `["@media (hover: hover)"]`; `[]` at top level. */
  conditions: string[];
  declarations: Record<string, string>;
}

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

/** The rules whose selector list is exactly `selectors`, in stylesheet order. */
export const rulesForSelectors = (...selectors: string[]) =>
  emittedRules().filter((rule) => {
    const list = postcss.rule({ selector: rule.selector }).selectors;
    return (
      list.length === selectors.length &&
      list.every((selector, i) => selector === selectors[i])
    );
  });
